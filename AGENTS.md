# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router (routes, layouts, pages). Keep route segments lowercase with hyphens; colocate page-level components when scoped to a route.
- `components/`: Reusable React components (PascalCase filenames). Keep UI-only components pure; prefer server components by default and add `"use client"` only when required.
- `contexts/`: React context providers and hooks for shared state.
- `lib/`: Utilities, DuckDB/OPFS helpers, and shared logic.
- `.docs_for_ai/` and `ARCH.md`: Reference docs for architecture and agent helpers.

## Build, Test, and Development Commands
- `npm run dev`: Start the local dev server at `http://localhost:3000`.
- `npm run build`: Production build (Next.js + WASM assets).
- `npm start`: Serve the production build.
- `npm run lint`: Run ESLint using `next/core-web-vitals` rules.
- `npm run typecheck`: TypeScript type checks with strict settings.

## Coding Style & Naming Conventions
- **Language**: TypeScript, strict mode enabled. Use `@/` path alias for absolute imports (see `tsconfig.json`).
- **Indentation**: 2 spaces; keep existing code style consistent.
- **Naming**: `PascalCase` for React components, `camelCase` for functions/vars, `kebab-case` route segments in `app/`.
- **Tailwind**: Prefer semantic component props; keep class lists readable and grouped logically.
- **Linting**: Fix issues surfaced by `npm run lint`; do not disable rules without justification.

## Testing Guidelines
- No formal test runner is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Place tests alongside source as `*.test.ts(x)` or in `__tests__/` mirrors.
- Aim for focused unit tests on `lib/` and interaction tests for complex components.
- If adding tests, include an `npm test` script and document how to run them.

## Commit & Pull Request Guidelines
- **Commits**: Follow Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `build:`, `chore:`). Recent history uses `chore`, `build`, `docs`.
- **PRs**: Provide a clear description, linked issues, before/after screenshots for UI, and test plan. Ensure `npm run lint` and `npm run typecheck` pass. Update `README.md`/`ARCH.md` when behavior or architecture changes.

## Security & Configuration Tips
- This is a client-side, privacy-first app; never commit secrets or large datasets.
- Keep `asyncWebAssembly` enabled in `next.config.js`; verify DuckDB-WASM loads in modern browsers.
- Respect CORS when referencing remote files; prefer local uploads during development.

## AI Agent Operating Notes
- **Search scope**: Do not search/grep inside `node_modules/`. Limit repository scans to source directories (e.g., `app/`, `components/`, `contexts/`, `lib/`, and project config files).
- **Examples**: Use `rg -n "pattern" -g '!node_modules/**'` or `grep -R --exclude-dir=node_modules "pattern" .` to keep `node_modules/` excluded.
