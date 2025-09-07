Refactoring Opportunities

Scope: Recommendations focus on performance, maintainability, and removing dead code. Items are grouped by priority with concrete file references and proposed actions.

High‑Impact Performance
- next.config.js: Remove custom splitChunks/sideEffects overrides.
  - Why: Next.js 15 already applies optimized chunking and tree‑shaking. Forcing `usedExports=true` and especially `sideEffects=false` can incorrectly dead‑strip code from libraries, causing subtle runtime bugs and larger bundles due to bailout. Manual cacheGroups increase config complexity with little gain.
  - Action: Rely on Next defaults; keep `@next/bundle-analyzer` on demand. Keep `compress` (Next enables gzip by default on server, but static export serves via CDN). Keep wasm rule if truly needed, but verify — DuckDB assets are served from `public/duckdb`, not bundled.
  - File: next.config.js

- ResultsGrid CSS: Import only one AG Grid theme.
  - Why: `components/ResultsGrid.tsx` imports both `ag-theme-alpine.css` and `ag-theme-quartz.css`, but only one is used at runtime. Importing both increases CSS payload.
  - Action: Pick a single theme (e.g., Quartz Dark + Light variants) and drop unused theme import.
  - File: components/ResultsGrid.tsx

- Interval polling and timers.
  - Why: Continuous 2s polling in `contexts/DuckDBContext.tsx` and 3s flush in `lib/duckdbManager.ts` keep work active in background tabs.
  - Action: Pause polling when `document.hidden` (visibility API). In the manager, skip periodic flush if `document.hidden` and there are no pending writes; consider exponential backoff.
  - Files: contexts/DuckDBContext.tsx, lib/duckdbManager.ts

- WASM preload duplication and version drift.
  - Why: `app/layout.tsx` hardcodes DuckDB version paths that must match `scripts/copy-duckdb.js`’s `ver` read from `node_modules`. Version mismatches will break preload/fetch.
  - Action: Single source of truth (e.g., export `DUCKDB_VERSION` from a small `lib/duckdbVersion.ts`, and use it in both the copy script and layout via env or import). Alternatively, inject as `process.env.NEXT_PUBLIC_DUCKDB_VERSION` during build.
  - Files: app/layout.tsx, scripts/copy-duckdb.js

- Unify loading state in DuckDB context.
  - Why: `contexts/DuckDBContext.tsx` has both `isLoading` and `initializationStage` with overlapping meaning; also mixes `loadingProgress` as a separate nullable object.
  - Action: Replace with a single discriminated union state: `{ stage: 'idle'|'loading'|'ready'|'error', progress?: {..} }`; derive `isReady` from stage + role once, not on each render.
  - File: contexts/DuckDBContext.tsx

- Extract DuckDB version and common paths.
  - Why: `/duckdb/1.29.1-dev269.0/*` literals appear in `app/layout.tsx` and `lib/duckdbManager.ts`.
  - Action: Centralize version and base path helper (e.g., `getDuckDbBaseUrl()`), to avoid drift.
  - Files: app/layout.tsx, lib/duckdbManager.ts

- Replace magic strings for SQL kind detection.
  - Why: Query type detection in `components/TabbedWorkbench.tsx` and `lib/autoSaver.ts` uses prefix checks and a regex.
  - Action: Use a single exported helper (keep regex) to classify SQL statements; reuse everywhere to avoid divergent behavior.
  - Files: lib/autoSaver.ts (export helper), components/TabbedWorkbench.tsx

- Consistent error surfaces.
  - Findings: Errors are converted to strings in several places; some wrap with `new Error`, others pass raw objects.
  - Action: Introduce `toErrorMessage(e: unknown): string` and use across UI and lib for consistent messaging.
  - Files: lib/utils.ts (add), propagate usage in components and lib

Dead Code & Redundancy
- Duplicate AG Grid theme CSS (noted above) and possibly unused icons.
  - Action: Audit `components/icons.tsx` for unused exports; drop dead icons to reduce bundle size.
  - Files: components/icons.tsx (scan for unused exports via IDE or `tsserver` diagnostics)

- Outdated comments and TODOs.
  - Findings: Several comments indicate “legacy mode” and temporary warnings; no actionable TODO tags, but stale comments may mislead.
  - Action: Trim legacy notes once multi‑tab path is default; keep concise rationale comments.

Build & DX (CloudFront + Cloudflare)
- Start script builds on every `npm start`.
  - Why: `prestart` runs `npm run build`, which is wasteful in deployed environments where artifacts are prebuilt.
  - Action: Remove `prestart` or guard by CI/ENV (e.g., only run in dev Docker). Prefer explicit `npm run build && npm start` in docs.
  - File: package.json

- copy‑duckdb script coupling.
  - Why: Script reads version from `node_modules`, layout hardcodes it.
  - Action: Expose version via `NEXT_PUBLIC_DUCKDB_VERSION` at build time; script writes to `public/duckdb/${ver}` only (avoid writing into `out/` post‑build; Next export will copy `public/`). Remove post‑build copy into `out`.
  - Files: scripts/copy-duckdb.js, next.config.js (ensure static asset inclusion)

- Webpack and CDN compression (CloudFront + Cloudflare, static export).
  - Context: Site is a static Next.js export served behind CloudFront (origin: static host/S3) and fronted by Cloudflare.
  - Why: Both CDNs handle gzip/brotli at the edge; double‑compressing during bundling increases build time with minimal benefit and can complicate caching. For versioned assets, long‑lived immutable caching is preferred over content negotiation at origin.
  - Action:
    - Remove `compression-webpack-plugin` entirely; rely on CDN edge compression.
    - Prefer not generating `.gz`/`.br` artifacts in `scripts/copy-duckdb.js`. If your CloudFront distribution and Cloudflare zone are configured to compress `application/wasm`, skip precompression (faster builds). If not, keep precompressed WASM only and ensure `Vary: Accept-Encoding` is set (already handled in `customHeaders.yaml`).
    - Keep very long `Cache-Control` on `js/css/wasm` and other static assets with `immutable` (see `customHeaders.yaml`). Ensure Cloudflare “Respect origin headers” and CloudFront cache policies are aligned.
  - Files: next.config.js, scripts/copy-duckdb.js, customHeaders.yaml

CDN‑Aware Notes (CloudFront + Cloudflare)
- Caching model:
  - Use versioned paths for DuckDB assets: `/duckdb/<version>/*`. With `immutable` and 1‑year TTL, deploys are safe via version bumps.
  - Keep `Vary: Accept-Encoding` for `js/css/wasm`. `customHeaders.yaml` already sets this; ensure both CDNs pass it through.
- Compression:
  - Prefer CDN edge compression for `js/css/json/svg/wasm`. Validate that both CDNs compress `application/wasm`; if not, ship a `.br` for wasm only.
- ETags/validation:
  - Static export artifacts can keep `generateEtags: false` in Next; CloudFront/Cloudflare will add/forward their own validators as needed. Primary cache control should rely on content‑hashing/versioned paths + `immutable`.
- HTML and documents:
  - Do not cache HTML long term. `customHeaders.yaml` sets no‑cache for `*.html`; configure Cloudflare Page Rules/Cache Rules and CloudFront Cache Policy to respect origin for HTML.
- Preload hints:
  - With edge caches in front, `<link rel="preload">` for WASM is fine but prefetching `.br/.gz` variants is unnecessary when CDNs perform content negotiation. Keep the preload for the primary `.wasm`; drop prefetches in code when refactoring.

UI/UX Performance
- Visualization lazy loading: Good use of `next/dynamic` + Suspense.
  - Minor: Ensure skeleton class names are deduplicated and small. Consider `fallback={null}` where shimmer isn’t visible.

- CodeMirror and Plotly heavy deps.
  - Action: Keep them dynamically imported where possible (already done). Consider `ssr: false` where server render mismatch occurs.
  - Files: components/SQLEditor.tsx, components/PlotlyChart.tsx, components/Visualization.tsx

Robustness Improvements
- Pause background work when tab hidden.
  - Apply to: multi‑tab heartbeats (if applicable), DB flush timer, status polling, and size checks.
  - Files: lib/multitab/boot.ts, lib/duckdbManager.ts, hooks/useInstrumentPanel.ts, contexts/DuckDBContext.tsx

- Safer unload handlers.
  - Why: `beforeunload` work is often skipped by browsers. The current code calls flush/checkpoint fire‑and‑forget.
  - Action: Treat as best‑effort only; ensure durability is handled primarily through regular checkpoints in durable ops.
  - File: lib/duckdbManager.ts

Small Wins
- ResultsGrid number formatting.
  - Action: Use `Intl.NumberFormat` memoized per locale instead of `toFixed(2)` to avoid floating artifacts and for i18n.
  - File: components/ResultsGrid.tsx

- Use `unknown` instead of `any` and narrow where used.
  - Files: many (durable ops, multitab, plotly transform)

- Remove duplicate CSS classes and ensure Tailwind tokens.
  - Scan for hardcoded colors; most components already use tokens (`bg-background`, `text-foreground`). Keep it consistent.

Candidate Tasks (Suggested PRs)
- PR 1: Trim next.config.js to Next defaults; drop manual splitChunks and compression; keep bundle analyzer and wasm rule only if needed.
- PR 2: Add `lib/logger.ts`, migrate verbose logging to debug‑gated calls across lib and hooks; remove emojis in logs or gate them to debug.
- PR 3: Type cleanup: introduce shared `QueryParams`, `SqlResult`, and multi‑tab message types; replace `any` in durable ops and plotly transforms; add `toErrorMessage` util and apply in UI.
- PR 4: Pause background timers and polling when tab is hidden; reduce periodic flush frequency; centralize DB version.
- PR 5: Remove `multiTabQuery.executeWriteQuery` and, if agreed, remove `lib/autoSaver.ts` plus tests (or mark clearly deprecated).
- PR 6: ResultsGrid CSS/theme imports: keep a single theme; switch number formatting to `Intl.NumberFormat`.
- PR 7: CDN configs: confirm CloudFront compression policy includes `application/wasm`; if yes, disable precompression in `scripts/copy-duckdb.js`. Ensure Cloudflare Cache Rules respect origin Cache‑Control for versioned assets and do not cache HTML.

Notes and Risks
- Changing `sideEffects` in webpack config can break packages that rely on side‑effectful modules (CSS-in-JS, polyfills). Removing our override reduces that risk.
- Silencing logs must retain critical warnings/errors. Keep `warn`/`error` always enabled.
- Removing `prestart` may affect current deployment flow; document the new process in README.
- Pausing timers in hidden tabs may delay perceived “saving” status updates; ensure durable operations checkpoint on completion regardless of timers.
