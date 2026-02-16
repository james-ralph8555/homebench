# HomeBench Modernization Implementation Plan

## Program Metadata

| Field | Value |
| --- | --- |
| Program | HomeBench modernization |
| Mode | Chromium-first, client-only, multi-tab retained |
| Status | Active |
| Last Updated | 2026-02-16 |
| Owner | Implementation agent |
| Canonical Tracking | This file is the source of truth for rollout status and commit mapping |

## Status Legend

- `planned`: scoped and ready for implementation.
- `in_progress`: currently being implemented on a feature branch.
- `blocked`: cannot proceed due to dependency or external constraint.
- `merged`: implemented, validated, and merged.

## Commit Tracking Protocol

1. Implement exactly one feature row per commit unless the row explicitly allows split commits.
2. Branch naming convention: `feat/<feature-id>-<short-slug>`.
3. Commit message convention: `type(<feature-id>): <summary>`.
4. Run the row-specific CLI validation command(s) from the `Validation` column.
5. Stop and ask the user how they want browser verification run in Charm Crush editor.
6. Provide browser test steps for that feature (route, setup, actions, expected result).
7. Wait for user confirmation on browser verification outcome.
8. After user confirmation, commit and update that row's `Status` and `Commit SHA` (short SHA, e.g., `a1b2c3d`).
9. If a feature is partially complete, keep `Status` as `in_progress` and record interim SHAs in `Notes`.
10. If blocked, set `Status` to `blocked` with an actionable blocker statement in `Notes`.

## Charm Crush Browser Verification Gate

Use this mandatory handoff prompt for every feature before marking it `merged`:

`Feature <ID> is ready for browser verification in Crush. Choose: (1) you run steps and report, (2) I run and report, (3) adjust steps first.`

Do not skip this gate for implementation features. Existing rows marked `merged` before this policy can remain as-is.

## High-Priority Feature Tracker

| Feature ID | Workstream | Priority | Status | Branch | Planned Commit Message | Commit SHA | Depends On | Validation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H01 | Runtime capability contract and compatibility modes (`full`/`degraded`/`unsupported`) | High | merged | `feat/h01-capability-contract` | `feat(H01): add runtime capability detection and compatibility mode contract` | b532735 | None | `npm run typecheck && npm run lint` | Surface capability mode in context and settings UI. |
| H02 | DuckDB runtime config single source of truth (version + asset paths + preload alignment) | High | planned | `feat/h02-runtime-config` | `feat(H02): unify duckdb runtime config and asset path wiring` | pending | H01 | `npm run typecheck && npm run lint && npm run build` | Remove hardcoded duplicate version literals. |
| H03 | Multi-tab transport re-architecture (typed protocol, real client routing, resilient failover) | High | planned | `feat/h03-multitab-transport` | `feat(H03): rework multitab transport and protocol typing` | pending | H01, H02 | `npm run typecheck && npm run lint && npm test` | Keep multi-tab behavior, replace fragile simulated port flow. |
| H04 | Non-destructive durability and corruption recovery state machine | High | planned | `feat/h04-recovery-state-machine` | `feat(H04): implement staged non-destructive recovery workflow` | pending | H03 | `npm run typecheck && npm run lint && npm test` | Never auto-wipe OPFS on recovery failure. |
| H05 | Memory budget manager and large-data guardrails for 4GB WASM constraints | High | planned | `feat/h05-memory-guardrails` | `feat(H05): add memory budget manager and large dataset guardrails` | pending | H01, H02 | `npm run typecheck && npm run lint && npm test` | Clarify JS heap vs DuckDB memory indicators. |
| H06 | Experimental threading support behind strict capability gates | High | planned | `feat/h06-threading-gates` | `feat(H06): gate experimental threading behind verified prerequisites` | pending | H01, H02 | `npm run typecheck && npm run lint` | Require COOP/COEP and clean fallback when unavailable. |
| H07 | Remote data/CORS preflight UX and actionable error mapping | High | planned | `feat/h07-cors-preflight` | `feat(H07): add remote source preflight checks and cors-focused error guidance` | pending | H01 | `npm run typecheck && npm run lint && npm test` | Preserve client-only architecture (no backend proxy). |
| H08 | Unified JSON ingest/object-size policy and preflight checks | High | planned | `feat/h08-json-ingest-policy` | `feat(H08): centralize json ingest limits and preflight validation` | pending | H05, H07 | `npm run typecheck && npm run lint && npm test` | Replace scattered `maximum_object_size` logic with shared policy helpers. |
| H09 | SQL identifier/literal safety hardening in generated SQL paths | High | planned | `feat/h09-sql-safety` | `feat(H09): harden sql composition with safe identifier and literal handling` | pending | H08 | `npm run typecheck && npm run lint && npm test` | Prioritize upload/schema-generation paths and metadata queries. |
| H10 | Test harness repair and modernization (Vitest alias + stale test updates) | High | planned | `feat/h10-test-harness` | `fix(H10): repair vitest alias resolution and update stale tests` | pending | H03, H04 | `npm test` | Current suite fails due missing `@/` alias support in Vitest config. |
| H11 | CI pipeline enforcement for `typecheck`, `lint`, `test`, and `build` | High | planned | `feat/h11-ci-pipeline` | `ci(H11): add ci workflow for typecheck lint test and build gates` | pending | H10 | CI run green on PR | Include failure visibility and artifact retention as needed. |
| H12 | Build reproducibility in restricted networks (font strategy and deterministic build behavior) | High | planned | `feat/h12-build-reproducibility` | `build(H12): make production builds deterministic without external font fetch dependency` | pending | H02 | `npm run build` in restricted network + normal network | Current build can fail when `fonts.googleapis.com` is unreachable. |

## Lower-Priority Improvement Tracker

| Feature ID | Workstream | Priority | Status | Branch | Planned Commit Message | Commit SHA | Depends On | Validation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L01 | AG Grid CSS/theme consolidation and number formatting cleanup | Low | planned | `feat/l01-grid-theme-cleanup` | `chore(L01): remove duplicate ag-grid theme imports and normalize number formatting` | pending | H10 | `npm run typecheck && npm run lint` | Keep one primary theme path and align dark/light strategy. |
| L02 | Logging consistency and console cleanup | Low | planned | `feat/l02-logging-consistency` | `chore(L02): standardize logger usage and remove ad-hoc console calls` | pending | H10 | `npm run lint` | Keep user-facing error behavior unchanged. |
| L03 | `any`-to-typed migration in runtime-critical paths | Low | planned | `feat/l03-type-hardening` | `refactor(L03): reduce any usage in multitab recovery and visualization pathways` | pending | H03, H04 | `npm run typecheck && npm run lint` | Focus on interfaces and protocol payload typing first. |
| L04 | Dead code and stale documentation claim cleanup | Low | planned | `feat/l04-dead-code-cleanup` | `chore(L04): remove stale claims and clean dead or duplicate documentation paths` | pending | H10 | `npm run lint` | Resolve docs-vs-runtime mismatches explicitly. |
| L05 | Diagnostics UX polish (export snapshot + guided steps) | Low | planned | `feat/l05-diagnostics-ux` | `feat(L05): improve diagnostics export and guided troubleshooting flow` | pending | H04 | `npm run typecheck && npm run lint && npm test` | Keep privacy-first local-only diagnostics output. |
| L06 | Query hints pipeline reconciliation (fully wire up or remove) | Low | planned | `feat/l06-query-hints` | `refactor(L06): reconcile query hints pipeline with runtime behavior` | pending | H10 | `npm run typecheck && npm run lint && npm test` | Avoid claiming optimizations that are not active in UI. |
| L07 | Accessibility/interaction polish in settings, export, and error flows | Low | planned | `feat/l07-a11y-polish` | `feat(L07): improve accessibility and interaction polish for settings and export flows` | pending | H01 | `npm run lint` + manual keyboard checks | Focus on keyboard flow, aria labeling, and error affordances. |

## Browser Test Matrix (Per Feature)

Each row below is the minimum browser verification script to provide to the user in Crush.

### High Priority

| Feature ID | Browser Test Script |
| --- | --- |
| H01 | Route: `/` -> Settings. Actions: inspect runtime capability mode and unavailable-feature messaging. Expected: mode shows `full`/`degraded`/`unsupported` with clear reason text. |
| H02 | Route: `/` (hard reload). Actions: open DevTools Network and inspect DuckDB worker/WASM asset paths and versions. Expected: all runtime assets resolve from one versioned base path with no mismatched literals. |
| H03 | Route: `/` in two tabs. Actions: run read query in both tabs, run write in leader tab, observe client behavior during leader refresh. Expected: typed protocol routing works, client reconnects, no silent hangs. |
| H04 | Route: `/` + Settings -> Storage. Actions: simulate interrupted write/upload, then trigger recovery path. Expected: staged recovery guidance appears, no automatic OPFS wipe, user explicitly chooses destructive reset if needed. |
| H05 | Route: `/` -> Upload + query results. Actions: import large dataset and monitor memory panel/guardrails. Expected: clear warning/block behavior before crash-risk size; JS heap and DuckDB/WASM limits are clearly distinguished. |
| H06 | Route: `/` -> Settings/diagnostics. Actions: run in context without COOP/COEP or SAB, then with prerequisites enabled. Expected: threading stays gated when prerequisites missing and cleanly enables only when requirements pass. |
| H07 | Route: `/` -> remote data flow. Actions: test remote source with valid CORS and failing CORS. Expected: preflight guidance explains CORS requirements and gives actionable remediation text. |
| H08 | Route: `/` -> upload JSON/JSONL. Actions: test object sizes below/above policy thresholds. Expected: unified preflight handling, consistent `maximum_object_size` behavior, and user-facing explanation before failure. |
| H09 | Route: `/` -> upload/schema/query builder flows. Actions: use table/column/file names with quotes/special chars and run generated SQL paths. Expected: identifiers/literals are safely quoted/escaped and queries remain valid. |
| H10 | Route: `/` basic smoke test after test harness fixes. Actions: run core UI flows (upload, query, export) and verify no regressions while `npm test` passes. Expected: browser behavior unchanged except intended fixes. |
| H11 | Route: GitHub/CI UI for target PR. Actions: verify required checks (`typecheck`, `lint`, `test`, `build`) execute and gate merge. Expected: failing checks block merge, successful checks allow merge. |
| H12 | Route: `/` production build output in normal and restricted-network scenarios. Actions: load app with network restrictions impacting external font hosts. Expected: build and runtime remain deterministic without external font fetch dependency. |

### Lower Priority

| Feature ID | Browser Test Script |
| --- | --- |
| L01 | Route: `/` -> Query results grid. Actions: inspect AG Grid theming in light/dark and numeric formatting. Expected: single consistent theme path and normalized number display. |
| L02 | Route: `/` full usage flow. Actions: run common tasks and inspect console logging output. Expected: logger is consistent, no noisy ad-hoc console spam, user-visible behavior unchanged. |
| L03 | Route: `/` multi-tab + visualization paths. Actions: exercise reconnect/recovery and chart flows that previously used `any`-heavy payloads. Expected: behavior stable with no runtime type-shape regressions. |
| L04 | Route: `/` + docs review. Actions: follow documented behavior and verify app matches docs in UI/runtime. Expected: stale claims removed and docs align with actual behavior. |
| L05 | Route: `/` -> diagnostics/troubleshooting UI. Actions: trigger diagnostics export and follow guided recovery steps. Expected: clear local-only diagnostic output and actionable guided flow. |
| L06 | Route: `/` -> SQL editor/query hints. Actions: run complex and simple queries and inspect hint pipeline output. Expected: hints shown only when truly active/accurate, no misleading optimization claims. |
| L07 | Route: `/` -> Settings/export/error dialogs. Actions: keyboard-only navigation (Tab/Shift+Tab/Enter/Escape) and screen-reader label checks. Expected: focus order, labels, and error affordances meet accessibility expectations. |

## Execution Order

1. H01 -> H02 -> H03 -> H04 -> H05 -> H10 -> H11.
2. H06 can proceed after H01 and H02.
3. H07 and H08 can begin after H01; H08 should follow H05 for memory policy alignment.
4. H09 should follow H08.
5. H12 should follow H02 and finalize after build-path changes settle.
6. Lower-priority features (`L01`-`L07`) can be batched after H10 unless explicitly needed earlier.

## Definition of Done (Per Feature)

A feature row can only move to `merged` when all are true:

1. Code/docs for that row are implemented.
2. Validation command(s) in `Validation` pass (or justified exception is documented in `Notes`).
3. Browser verification steps were provided and user-confirmed in Charm Crush workflow.
4. Commit SHA is recorded in the row.
5. Dependent docs are updated if behavior or expectations changed.

## Standard Validation Commands

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Run the subset required by each feature row, then update its status + SHA.
