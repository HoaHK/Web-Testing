param(
    [string]$FeatureName = "Checkout_Flow",
    [ValidateSet("all", "web", "api")]
    [string]$Platform = "all",
    # full | crawl-only | guided-only | review-only (3-3F) | debate-only (3B-3F, reuses review-verdict.md)
    [string]$Mode = "full",
    [int]$MaxRetries = 3,
    [int]$MaxDebateRounds = 2
)

$ErrorActionPreference = "Stop"

# Agent CLIs write progress to stderr; under "Stop", PowerShell 5.1 turns that into a terminating
# NativeCommandError and kills the run while the agent keeps going. Run agents with "Continue".
# Prompts must not contain double quotes: PowerShell 5.1 splits native arguments at them.
function Invoke-Agent([scriptblock]$Command) {
    $ErrorActionPreference = "Continue"
    & $Command
}

$Verdict = ".qa-pipeline/state/review-verdict.md"
$Debate = ".qa-pipeline/state/debate.md"
$Consensus = ".qa-pipeline/state/consensus.md"

# Ensure directories exist
$dirs = @(".qa-pipeline/queue", ".qa-pipeline/specs", ".qa-pipeline/state", ".qa-pipeline/reports", ".qa-pipeline/raw")
foreach ($d in $dirs) {
    if (!(Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
}

if (!(Test-Path "CLAUDE.md") -and (Test-Path "AGENTS.md")) {
    Copy-Item "AGENTS.md" "CLAUDE.md" -Force
}

function Get-TargetSpecs {
    switch ($Platform) {
        "web"     { return ".qa-pipeline/specs/web-e2e.md" }
        "api"     { return ".qa-pipeline/specs/api-workflow.md" }
        default   { return @(".qa-pipeline/specs/web-e2e.md", ".qa-pipeline/specs/api-workflow.md") }
    }
}

function Get-PlaywrightCmd {
    switch ($Platform) {
        "web"     { return "npx playwright test --project=web" }
        "api"     { return "npx playwright test --project=api" }
        default   { return "npx playwright test" }
    }
}

$TargetSpecs = Get-TargetSpecs
$PwCmd = Get-PlaywrightCmd

# --- STEP 1A: AUTONOMOUS CRAWL ---
if ($Mode -eq "full" -or $Mode -eq "crawl-only") {
    Write-Host ">>> [STEP 1A] ANTIGRAVITY: Autonomous Deep Crawl ($FeatureName | $Platform)" -ForegroundColor Cyan
    Invoke-Agent { agy --dangerously-skip-permissions -p "Scope: Feature '$FeatureName', Platform '$Platform'. Autonomously traverse all reachable screens, features, and dialogs. Persist compact pipe-delimited tables into: Web (.qa-pipeline/specs/web-e2e.md), API (.qa-pipeline/specs/api-workflow.md). Tag rows with Src='Auto'. Follow AGENTS.md Step 1 rules 3-4: capture the API calls behind every action, and never submit an order or payment (route-guard SubmitTicket*/UpdateCartData/ProcessMobilePay/CheckSaleReceiptAccepted)." }
}

# --- STEP 1B: GUIDED CRAWL ---
if ($Mode -eq "full" -or $Mode -eq "crawl-only" -or $Mode -eq "guided-only") {
    # One agy run per row (a stuck row cannot block the rest); later rows resume the same conversation.
    $pendingRows = @(Select-String -Path ".qa-pipeline/queue/user-guided.md" -Pattern '^\|(USR-\d+)\|.*\|PENDING_CAPTURE\|\s*$' |
        ForEach-Object { $_.Matches[0].Groups[1].Value })
    if ($pendingRows.Count -gt 0) {
        $first = $true
        foreach ($row in $pendingRows) {
            Write-Host ">>> [STEP 1B] ANTIGRAVITY: User-Guided Crawl for $row..." -ForegroundColor Cyan
            $rowPrompt = "Step 1B (guided crawl, AGENTS.md section 2 rule 2). Process ONLY row $row of .qa-pipeline/queue/user-guided.md. Read-only reuse: take locators of captured views from .qa-pipeline/specs/*.md and the setup flow from pages/** and fixtures/**; inspect the DOM only for what is new. Use a fixed 1280x800 viewport. Load .qa-pipeline/raw/agy-state.json as storageState if it exists and is still valid; after setup save storageState there. Capture identifiers and the API calls each step triggers into the specs files, appending as each sub-step is captured. Never wait more than 5 minutes on one background task. Keep the AGENTS.md mutation guard on unless the row says Mode=LIVE_SANDBOX. Finish by setting the row Status to CAPTURED:<ViewIDs> or PARTIAL:<ViewIDs> - <what is missing and why>."
            if ($first) {
                Invoke-Agent { agy --dangerously-skip-permissions --print-timeout 45m -p $rowPrompt }
                $first = $false
            } else {
                Invoke-Agent { agy --dangerously-skip-permissions --continue --print-timeout 45m -p $rowPrompt }
            }
        }
    } else {
        Write-Host ">>> [STEP 1B] No PENDING_CAPTURE items in queue. Skipping." -ForegroundColor Yellow
    }
}

if ($Mode -eq "crawl-only" -or $Mode -eq "guided-only") {
    Write-Host "✅ Discovery & Capture completed." -ForegroundColor Green
    exit
}

# --- STEP 2: CODING ---
if ($Mode -eq "full") {
    Write-Host ">>> [STEP 2] CLAUDE CODE: Implementing Playwright tests..." -ForegroundColor Cyan
    Invoke-Agent { claude -p "Read ONLY the spec files: $TargetSpecs. Implement modular Playwright Page Objects and tests covering 100% of rows. Follow CLAUDE.md." --dangerously-skip-permissions }
}

# --- STEP 3: CODE REVIEW ---
# codex runs read-only, so its final message is written to the target file with -o.
if ($Mode -ne "debate-only") {
    Write-Host ">>> [STEP 3] CODEX CLI: Auditing implementation..." -ForegroundColor Cyan
    Invoke-Agent { codex exec --sandbox read-only -o $Verdict "Inspect git diff and every test under tests/** against $TargetSpecs. Verify 100% coverage, zero anti-patterns, and that every test's expect() calls prove what its title claims (AGENTS.md section 4). Do NOT edit files. Output Line 1: VERDICT: APPROVED or VERDICT: CHANGES_REQUIRED, then a table |ID|File:Line|TestTitle|Issue|Required fix| with IDs F1, F2, ..." }
}

# --- STEPS 3B-3F: DEBATE & CONSENSUS (AGENTS.md section 5) ---
Write-Host ">>> [STEP 3B] CLAUDE CODE: Rebutting review findings..." -ForegroundColor Cyan
Invoke-Agent { claude -p "Step 3B (rebuttal, AGENTS.md section 5). Read ONLY $Verdict, the test/page files it cites, and $TargetSpecs. Do NOT edit code. Challenge every finding ID: position AGREE, PARTIAL or DISAGREE, with file:line evidence and a counter-proposal when you do not fully agree. Add tests whose assertions do not prove their title that the reviewer missed as C1, C2, ... Overwrite $Debate with a '# Review Debate' heading, then a '## Round 1 - claude rebuttal' section holding the table |ID|Position|Evidence|Counter-proposal|." --dangerously-skip-permissions }

Write-Host ">>> [STEP 3C] ANTIGRAVITY: Adding arguments..." -ForegroundColor Cyan
Invoke-Agent { agy --dangerously-skip-permissions -p "Step 3C (arguments, AGENTS.md section 5). Read ONLY $Verdict, $Debate, the test files they cite and $TargetSpecs. You may open the app to gather evidence but keep the AGENTS.md Step 1 mutation guard on. Do NOT edit code. For every finding (F*, C*) add arguments neither codex nor claude raised: observed app behaviour, spec gaps, flakiness, risk. Raise new findings as A1, A2, ... Append to $Debate a '## Round 1 - agy arguments' section holding the table |ID|Stance (supports codex / supports claude / new)|Argument and evidence|Suggested resolution|." }

Remove-Item $Consensus -ErrorAction SilentlyContinue
$unanimous = $false
for ($round = 1; $round -le $MaxDebateRounds; $round++) {
    Write-Host ">>> [STEP 3D] CODEX CLI: Drafting consensus (round $round/$MaxDebateRounds)..." -ForegroundColor Cyan
    Invoke-Agent { codex exec --sandbox read-only -o $Consensus "Step 3D (consensus draft, round $round, AGENTS.md section 5). Read ONLY $Verdict, $Debate and $Consensus if it exists. Weigh every argument and objection fairly; you may revise or drop your own findings. Do NOT edit files. Output Line 1: CONSENSUS: DRAFT, then the table |ID|Decision (FIX / MODIFY / DROP)|Final required fix|Files|Rationale| with one row per F*, C* and A* ID." }

    Write-Host ">>> [STEP 3E] CLAUDE CODE + ANTIGRAVITY: Voting (round $round)..." -ForegroundColor Cyan
    Invoke-Agent { claude -p "Step 3E (vote, round $round, AGENTS.md section 5). Read ONLY $Consensus and $Debate. Do NOT edit code. For every row of the draft vote AGREE or OBJECT (OBJECT only for a substantive disagreement). Append to $Debate a '## Round $round votes - claude' section with one line per row in the form ID: AGREE - reason, or ID: OBJECT - reason." --dangerously-skip-permissions }
    Invoke-Agent { agy --dangerously-skip-permissions -p "Step 3E (vote, round $round, AGENTS.md section 5). Read ONLY $Consensus and $Debate. Do NOT edit code. For every row of the draft vote AGREE or OBJECT (OBJECT only for a substantive disagreement). Append to $Debate a '## Round $round votes - agy' section with one line per row in the form ID: AGREE - reason, or ID: OBJECT - reason." }

    # A missing vote section counts as an objection, so a silent agent never produces "unanimous".
    $debateText = Get-Content $Debate -Raw
    $voted = ($debateText -match "## Round $round votes - claude") -and ($debateText -match "## Round $round votes - agy")
    $roundVotes = ($debateText -split "## Round $round votes", 2)[-1]
    if ($voted -and $roundVotes -notmatch '(?m)^\W*[FCA]\d+\W*:\s*\**OBJECT') {
        $unanimous = $true
        break
    }
    Write-Host "--> Objections raised in round $round." -ForegroundColor Yellow
}

$agreement = if ($unanimous) { "unanimous" } else { "not unanimous after $MaxDebateRounds rounds: decide each row by 2-of-3 majority (codex votes for its own draft)" }
Write-Host ">>> [STEP 3F] CODEX CLI: Finalizing consensus ($agreement)..." -ForegroundColor Cyan
Invoke-Agent { codex exec --sandbox read-only -o $Consensus "Step 3F (finalize, AGENTS.md section 5). Read ONLY $Consensus and $Debate. Votes are $agreement. Do NOT edit files. Output Line 1: CONSENSUS: CHANGES_REQUIRED if any final row is FIX or MODIFY, else CONSENSUS: APPROVED. Line 2: Agreement: UNANIMOUS or Agreement: MAJORITY. Then the table |ID|Decision|Final required fix|Files|codex|claude|agy| with each agent's final vote." }

if ($Mode -ne "full") {
    Write-Host "✅ Review debate completed. See $Consensus and $Debate." -ForegroundColor Green
    exit
}

# --- STEP 3G: APPLY CONSENSUS ---
if ((Get-Content $Consensus -TotalCount 1) -match "CHANGES_REQUIRED") {
    Write-Host ">>> [STEP 3G] CLAUDE CODE: Applying agreed changes..." -ForegroundColor Cyan
    Invoke-Agent { claude -p "Step 3G (apply, AGENTS.md section 5). Read ONLY $Consensus and the files it lists. Implement every FIX/MODIFY row exactly; ignore DROP rows. Never delete expect(), weaken assertions or add test.skip()." --dangerously-skip-permissions }
}

# --- STEPS 4 - 6: TEST & FIX LOOP ---
$retry = 0
$testPassed = $false

while ($retry -lt $MaxRetries) {
    Write-Host "--> [STEP 4] Running Playwright ($PwCmd) - Attempt $($retry+1)/$MaxRetries..." -ForegroundColor Cyan
    
    $testResult = Invoke-Expression "$PwCmd --reporter=json > .qa-pipeline/raw/test-run.json 2>&1"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All Playwright tests PASSED!" -ForegroundColor Green
        $testPassed = $true
        break
    } else {
        $retry++
        Write-Host "❌ Test failure detected. Analyzing failures..." -ForegroundColor Red
        
        # Simple digest fallback for PowerShell
        $digest = "|SpecFile|TestTitle|Status|`n|---|---|---|`n"
        $jsonRaw = Get-Content ".qa-pipeline/raw/test-run.json" -Raw | ConvertFrom-Json
        foreach ($spec in $jsonRaw.specs) {
            foreach ($t in $spec.tests) {
                if ($t.status -eq "unexpected" -or $t.status -eq "flaky") {
                    $digest += "| $($spec.file) | $($t.title) | $($t.status) |`n"
                }
            }
        }
        $digest | Set-Content ".qa-pipeline/state/failed-digest.md" -Encoding utf8

        Write-Host "--> [STEP 5] CLAUDE CODE: Fixing failing tests..." -ForegroundColor Cyan
        Invoke-Agent { claude -p "Read ONLY .qa-pipeline/state/failed-digest.md and failing test files. Fix broken locators or waits. Never delete expect() or add test.skip()." --dangerously-skip-permissions }

        Write-Host "--> [STEP 6] CODEX CLI: Auditing bug fix..." -ForegroundColor Cyan
        Invoke-Agent { codex exec --sandbox read-only -o $Verdict "Run git diff and read failed-digest.md. Verify fix resolves root cause without weakening assertions. Do NOT edit files. Output Line 1: VERDICT: APPROVED or VERDICT: REJECTED." }
    }
}

# --- STEP 7: FINAL REPORT ---
Write-Host ">>> [STEP 7] ANTIGRAVITY: Generating final report..." -ForegroundColor Cyan
Invoke-Agent { agy --dangerously-skip-permissions -p "Generate final report at .qa-pipeline/reports/final-report.md for feature '$FeatureName'." }
Write-Host "🎉 Workflow complete! Report saved at: .qa-pipeline/reports/final-report.md" -ForegroundColor Green
