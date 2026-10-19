param(
    [string]$FeatureName = "Checkout_Flow",
    [string]$Platform = "all",
    [string]$Mode = "full",
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Stop"

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
        "android" { return ".qa-pipeline/specs/android-e2e.md" }
        "web"     { return ".qa-pipeline/specs/web-e2e.md" }
        "api"     { return ".qa-pipeline/specs/api-workflow.md" }
        default   { return @(".qa-pipeline/specs/android-e2e.md", ".qa-pipeline/specs/web-e2e.md", ".qa-pipeline/specs/api-workflow.md") }
    }
}

function Get-PlaywrightCmd {
    switch ($Platform) {
        "android" { return "npx playwright test --project=android" }
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
    agy --dangerously-skip-permissions -p "Scope: Feature '$FeatureName', Platform '$Platform'. Autonomously traverse all reachable screens, features, and dialogs. Persist compact pipe-delimited tables into: Android (.qa-pipeline/specs/android-e2e.md), Web (.qa-pipeline/specs/web-e2e.md), API (.qa-pipeline/specs/api-workflow.md). Tag rows with Src='Auto'."
}

# --- STEP 1B: GUIDED CRAWL ---
if ($Mode -eq "full" -or $Mode -eq "crawl-only" -or $Mode -eq "guided-only") {
    $guidedContent = Get-Content ".qa-pipeline/queue/user-guided.md" -Raw
    if ($guidedContent -match "PENDING_CAPTURE") {
        Write-Host ">>> [STEP 1B] ANTIGRAVITY: Executing User-Guided Crawl..." -ForegroundColor Cyan
        agy --dangerously-skip-permissions -p "Read ONLY .qa-pipeline/queue/user-guided.md. For every row with Status='PENDING_CAPTURE': execute steps, capture identifiers into corresponding specs files, and update status to CAPTURED:<ViewID>."
    } else {
        Write-Host ">>> [STEP 1B] No PENDING_CAPTURE items in queue. Skipping." -ForegroundColor Yellow
    }
}

if ($Mode -eq "crawl-only" -or $Mode -eq "guided-only") {
    Write-Host "✅ Discovery & Capture completed." -ForegroundColor Green
    exit
}

# --- STEP 2: CODING ---
Write-Host ">>> [STEP 2] CLAUDE CODE: Implementing Playwright tests..." -ForegroundColor Cyan
claude -p "Read ONLY the spec files: $TargetSpecs. Implement modular Playwright Page Objects and tests covering 100% of rows. Follow CLAUDE.md." --dangerously-skip-permissions

# --- STEP 3: CODE REVIEW ---
Write-Host ">>> [STEP 3] CODEX CLI: Auditing initial implementation..." -ForegroundColor Cyan
codex exec --sandbox read-only "Inspect git diff against $TargetSpecs. Verify 100% coverage and zero anti-patterns. Write verdict to .qa-pipeline/state/review-verdict.md starting with Line 1: VERDICT: APPROVED or VERDICT: CHANGES_REQUIRED."

$verdict = Get-Content ".qa-pipeline/state/review-verdict.md" -Raw
if ($verdict -match "CHANGES_REQUIRED") {
    Write-Host "--> Codex requested changes. Handing back to Claude..." -ForegroundColor Yellow
    claude -p "Read ONLY .qa-pipeline/state/review-verdict.md and fix reported files." --dangerously-skip-permissions
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
        claude -p "Read ONLY .qa-pipeline/state/failed-digest.md and failing test files. Fix broken locators or waits. Never delete expect() or add test.skip()." --dangerously-skip-permissions

        Write-Host "--> [STEP 6] CODEX CLI: Auditing bug fix..." -ForegroundColor Cyan
        codex exec --sandbox read-only "Run git diff and read failed-digest.md. Verify fix resolves root cause without weakening assertions. Overwrite .qa-pipeline/state/review-verdict.md with Line 1: VERDICT: APPROVED or VERDICT: REJECTED."
    }
}

# --- STEP 7: FINAL REPORT ---
Write-Host ">>> [STEP 7] ANTIGRAVITY: Generating final report..." -ForegroundColor Cyan
agy --dangerously-skip-permissions -p "Generate final report at .qa-pipeline/reports/final-report.md for feature '$FeatureName'."
Write-Host "🎉 Workflow complete! Report saved at: .qa-pipeline/reports/final-report.md" -ForegroundColor Green
