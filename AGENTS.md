# HomeBench Agent Guide

This document is the operational guide for coding agents working in this repository.

## Canonical Sources

- Master implementation tracker: `docs/IMPLEMENTATION_PLAN.md`
- Project overview: `README.md`
- App architecture: `app/README.md`
- Engine/storage internals: `lib/README.md`
- UI/component map: `components/README.md`

Do not create ad-hoc assistant-specific docs outside these canonical docs unless explicitly requested.

## Required Workflow

1. Identify the target feature row (`Hxx` or `Lxx`) in `docs/IMPLEMENTATION_PLAN.md`.
2. Implement one feature row per commit unless the row explicitly allows splitting.
3. Use commit message style: `type(<feature-id>): <summary>`.
5. Run the command subset listed in the target feature's `Validation` column.
6. Stop and ask the user how they want browser verification performed before closing the feature.
7. Provide explicit browser test steps (route, actions, expected outcome) for that feature.
8. Do not mark a feature row as `merged` until the user confirms browser verification results.
9. After user-confirmed browser verification, commit and update that row's `Status` and `Commit SHA`.

## Crush Browser Verification Gate

Primary implementation environment is Charm Crush editor. For every feature row:

1. Finish code changes and CLI validation.
2. Pause and send this checkpoint prompt:
   - `Feature <ID> is ready for browser verification in Crush. Choose: (1) you run the steps and report, (2) I run and report, (3) adjust test steps first.`
3. Provide a short browser checklist for the feature:
   - `URL/Route`
   - `Setup/fixtures`
   - `Actions`
   - `Expected results`
4. Wait for user confirmation before setting the row to `merged`.

## Chrome DevTools MCP

This project is configured with Chrome DevTools MCP (`.crush.json`) for browser automation.

### Setup

Start Chromium with remote debugging before using browser tools:

```bash
chromium --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile
```

### Available MCP Tools

All tools are prefixed with `mcp_chrome-devtools_`:

- **Navigation**: `navigate_page`, `new_page`, `close_page`, `list_pages`, `select_page`, `wait_for`
- **Input**: `click`, `fill`, `fill_form`, `hover`, `press_key`, `drag`, `handle_dialog`, `upload_file`
- **Debugging**: `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`
- **Performance**: `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
- **Network**: `list_network_requests`, `get_network_request`

### Browser Verification with MCP

When running option (2) from the verification gate, use these tools to:
1. `mcp_chrome-devtools_navigate_page` to load `http://localhost:3000`
2. `mcp_chrome-devtools_take_screenshot` to capture state
3. `mcp_chrome-devtools_click`/`mcp_chrome-devtools_fill` for interactions
4. `mcp_chrome-devtools_list_console_messages` to check for errors

## Build, Test, and Dev Commands

- `npm run dev`: start local development server.
- `npm run build`: production build.
- `npm start`: serve production build.
- `npm run lint`: lint checks.
- `npm run typecheck`: TypeScript checks.
- `npm test`: unit tests.

## Repository Structure

- `app/`: Next.js app router and global layout/styles.
- `components/`: UI components and `components/ui` primitives.
- `contexts/`: context providers (including DuckDB runtime context).
- `hooks/`: reusable React hooks.
- `lib/`: DuckDB, multitab, persistence, ingestion, export, and utility logic.
- `docs/`: implementation planning and tracking docs.
- `test/`, `lib/__tests__/`: Vitest setup and tests.

## Coding Standards

- Language: TypeScript (strict mode).
- Imports: prefer `@/` aliases.
- React: prefer server components unless client interactivity is required.
- Naming: `PascalCase` components, `camelCase` functions/variables.
- Styling: prefer Tailwind tokens (`bg-background`, `text-foreground`, etc.) over hardcoded colors.
- Keep UI primitives under `components/ui/`.

## Browser Compatibility Policy

- Product direction is Chromium-first with explicit degraded behavior where features are unavailable.
- Architecture remains client-only (no default backend proxy).
- Multi-tab support is retained and hardened (not removed).
- Always document compatibility-impacting changes in:
  - `README.md`
  - `app/README.md`
  - `lib/README.md`
  - `components/README.md`
  - `docs/IMPLEMENTATION_PLAN.md` (status + SHA)

## Documentation Hygiene

When behavior changes:

1. Update user-facing docs and internal architecture docs in the same PR.
2. Remove contradictory or stale claims instead of layering extra caveats.
3. Keep troubleshooting steps actionable and ordered from least destructive to most destructive.

## Search and Editing Guidance

- Do not scan `node_modules`.
- Prefer `rg` for search and `rg --files` for file discovery.
- Keep changes scoped to the active feature row.
- Avoid unrelated refactors in the same commit.
