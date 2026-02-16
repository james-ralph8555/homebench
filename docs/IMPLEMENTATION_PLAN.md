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
4. After each commit, update that row's `Status` and `Commit SHA` (short SHA, e.g., `a1b2c3d`).
5. If a feature is partially complete, keep `Status` as `in_progress` and record interim SHAs in `Notes`.
6. If blocked, set `Status` to `blocked` with an actionable blocker statement in `Notes`.

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
3. Commit SHA is recorded in the row.
4. Dependent docs are updated if behavior or expectations changed.

## Standard Validation Commands

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Run the subset required by each feature row, then update its status + SHA.
