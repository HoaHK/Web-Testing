# Multi-Agent Playwright Testing Rules (Token-Optimized)

> Sync via ln -sf AGENTS.md CLAUDE.md. All agents must read ONLY the files assigned to their current step.
> Scope: Web E2E and API only.

## 1. Agent Roles & Scoped File Access
| Agent | Step | Read Scope (STRICT) | Write Scope (STRICT) |
|---|---|---|---|
| agy | 1A (Auto-Crawl) | App DOM/UI/HAR | .qa-pipeline/specs/*.md |
| agy | 1B (Guided-Crawl) | .qa-pipeline/queue/user-guided.md; read-only reuse: .qa-pipeline/specs/*.md, pages/**, fixtures/** | .qa-pipeline/specs/*.md, user-guided.md, .qa-pipeline/raw/agy-state.json |
| claude | 2 (Coding) | .qa-pipeline/specs/<target>.md | pages/**, tests/**, fixtures/** |
| codex | 3 (Code Review) | git diff, .qa-pipeline/specs/<target>.md | .qa-pipeline/state/review-verdict.md |
| claude | 3B (Rebuttal) | review-verdict.md, test/page files it cites, specs/<target>.md | .qa-pipeline/state/debate.md (overwrite) |
| agy | 3C (Arguments) | review-verdict.md, debate.md, cited test files, specs/<target>.md, App (read-only) | debate.md (append) |
| codex | 3D (Consensus Draft) | review-verdict.md, debate.md | .qa-pipeline/state/consensus.md |
| claude, agy | 3E (Vote) | consensus.md, debate.md | debate.md (append own votes) |
| codex | 3F (Finalize) | consensus.md, debate.md | consensus.md |
| claude | 3G (Apply) | consensus.md, files it lists | Files listed in FIX/MODIFY rows ONLY |
| agy | 4 (Run & Filter) | .qa-pipeline/raw/test-run.json | .qa-pipeline/state/failed-digest.md |
| claude | 5 (Bug Fix) | .qa-pipeline/state/failed-digest.md, failing .spec.ts | Failing test/page files ONLY |
| codex | 6 (Fix Review) | git diff -U2, .qa-pipeline/state/failed-digest.md | .qa-pipeline/state/review-verdict.md |
| agy | 7 (Final Report) | .qa-pipeline/specs/*.md, state/*, raw/test-run.json | .qa-pipeline/reports/final-report.md |

## 2. Step 1 Discovery & Guided Capture Rules (agy)
1. **Pass 1 (Auto-Crawl):** Traverse all reachable screens, features, and dialogs. Persist compact entries into .qa-pipeline/specs/web-e2e.md and api-workflow.md.
2. **Pass 2 (User-Guided Crawl):** Read rows with Status=PENDING_CAPTURE in .qa-pipeline/queue/user-guided.md, execute navigation steps/mocks, capture elements, and append to specs.
   - **Reuse, don't rediscover:** take locators for already-captured views from specs/*.md and the setup flow (store -> PICK UP -> pickup time -> add item) from pages/** and fixtures/**; inspect the DOM only for what is new in the row.
   - **One row per run, one session per pass:** the orchestrator runs each row separately and resumes the same agy conversation (`--continue`) for later rows. Use a fixed 1280x800 viewport. Save browser storage after setup to .qa-pipeline/raw/agy-state.json (Playwright `storageState`) and load it in later rows when still valid.
   - **Persist incrementally:** append findings as each sub-step is captured; never wait more than 5 minutes on one background task. End every row as `CAPTURED:<ViewIDs>` or `PARTIAL:<ViewIDs> - <what is missing and why>`.
3. **API capture (both passes):** Record network traffic for every user action. Per call: method, endpoint, `targetAction`, decoded `param`, status, response shape -> api-workflow.md; reference the triggered `targetAction` in the web-e2e.md Payload/Transition column. Mark client-encrypted payloads as "UI-only".
4. **Mutation guard:** Before any step that can create an order or move money, crawl with a route guard that aborts and logs requests for `SubmitTicket*`, `UpdateCartData`, `ProcessMobilePay`, `CheckSaleReceiptAccepted` and payment-gateway POSTs. Stop at the final submit button (e.g. Pay) and capture its form + validation only. Execute a real submit ONLY for a queue row with `Mode=LIVE_SANDBOX` that names the sandbox card and expected result.

## 3. Playwright Implementation Rules (claude)
1. **Web/API:** Assert id/event_id (Web via race-free Promise.all) and API status/schema.
2. **Layout:** Web tests go in tests/web/** (project `web`); API tests go in tests/api/** (project `api`, use the `request` fixture).
3. **Guardrails:** Zero waitForTimeout(), explicit dialog visibility checks.
4. **Checkout/Payment:** Default tests drive the UI up to Pay and intercept the mutating request with `page.route` (assert it was sent with the right `targetAction`, then abort) so no order is created. Live order tests go in tests/live/** under a `live` project that is added to playwright.config.ts only when `LIVE_ORDER=1`; card data comes from env vars, never committed.

## 4. Review & Anti-Cheat Guardrails (codex)
1. Output verdict on Line 1 of .qa-pipeline/state/review-verdict.md: APPROVED, CHANGES_REQUIRED, or REJECTED.
2. **Step 6 Rule:** Reject if claude deletes expect(), weakens assertions, or adds test.skip().
3. **Title vs assertions:** Flag every test whose expect() calls do not prove what its title claims. Number findings F1, F2, ...

## 5. Review Debate & Consensus (Steps 3B-3G)
1. **3B Rebuttal (claude):** Challenge each finding: AGREE / PARTIAL / DISAGREE with file:line evidence and a counter-proposal. Add missed findings as C1, C2, ... No code edits.
2. **3C Arguments (agy):** Add arguments neither side raised (observed app behaviour, spec gaps, flakiness, risk). New findings as A1, A2, ... No code edits; app access is read-only under the Step 1 mutation guard.
3. **3D Draft (codex):** Weigh all arguments (codex may revise its own findings) and draft consensus.md: Line 1 `CONSENSUS: DRAFT`, one row per ID with Decision FIX / MODIFY / DROP.
4. **3E Vote (claude, agy):** Each appends `ID: AGREE - reason` or `ID: OBJECT - reason` per row. Any OBJECT -> codex redrafts (back to 3D), max 2 rounds.
5. **3F Finalize (codex):** Unanimous -> `Agreement: UNANIMOUS`; otherwise each row is decided by 2-of-3 majority -> `Agreement: MAJORITY`. Line 1: `CONSENSUS: CHANGES_REQUIRED` (any FIX/MODIFY row) or `CONSENSUS: APPROVED`.
6. **3G Apply (claude):** Implement FIX/MODIFY rows exactly; ignore DROP rows. Section 4 rule 2 applies.
