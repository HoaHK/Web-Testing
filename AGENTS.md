# Multi-Agent Playwright Testing Rules (Token-Optimized)

> Sync via ln -sf AGENTS.md CLAUDE.md. All agents must read ONLY the files assigned to their current step.

## 1. Agent Roles & Scoped File Access
| Agent | Step | Read Scope (STRICT) | Write Scope (STRICT) |
|---|---|---|---|
| gy | 1A (Auto-Crawl) | App DOM/UI/HAR | .qa-pipeline/specs/*.md |
| gy | 1B (Guided-Crawl) | .qa-pipeline/queue/user-guided.md | .qa-pipeline/specs/*.md, user-guided.md |
| claude | 2 (Coding) | .qa-pipeline/specs/<target>.md | pages/**, 	ests/**, ixtures/** |
| codex | 3 (Code Review) | git diff, .qa-pipeline/specs/<target>.md | .qa-pipeline/state/review-verdict.md |
| gy | 4 (Run & Filter) | .qa-pipeline/raw/test-run.json | .qa-pipeline/state/failed-digest.md |
| claude | 5 (Bug Fix) | .qa-pipeline/state/failed-digest.md, failing .spec.ts | Failing test/page files ONLY |
| codex | 6 (Fix Review) | git diff -U2, .qa-pipeline/state/failed-digest.md | .qa-pipeline/state/review-verdict.md |
| gy | 7 (Final Report) | .qa-pipeline/specs/*.md, state/*, aw/test-run.json | .qa-pipeline/reports/final-report.md |

## 2. Step 1 Discovery & Guided Capture Rules (gy)
1. **Pass 1 (Auto-Crawl):** Traverse all reachable screens, features, and dialogs. Persist compact entries into .qa-pipeline/specs/android-e2e.md, web-e2e.md, and pi-workflow.md.
2. **Pass 2 (User-Guided Crawl):** Read rows with Status=PENDING_CAPTURE in .qa-pipeline/queue/user-guided.md, execute navigation steps/mocks, capture elements, and append to specs.

## 3. Playwright Implementation Rules (claude)
1. **Android/Web/API:** Assert locator/key (Android), id/event_id (Web via race-free Promise.all), and API status/schema.
2. **Guardrails:** Zero waitForTimeout(), explicit dialog visibility checks.

## 4. Review & Anti-Cheat Guardrails (codex)
1. Output verdict on Line 1 of .qa-pipeline/state/review-verdict.md: APPROVED, CHANGES_REQUIRED, or REJECTED.
2. **Step 6 Rule:** Reject if claude deletes expect(), weakens assertions, or adds 	est.skip().
