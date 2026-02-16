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
4. Run the command subset listed in the target feature's `Validation` column.
5. Run automated browser verification via Chrome DevTools MCP (see Browser Verification section).
6. Notify user with test results and request manual validation.
7. Do not mark a feature row as `merged` until user confirms validation.
8. After user confirmation, update the row's `Status` and `Commit SHA`.

## Environment Assumptions

**CRITICAL: The agent must assume these services are already running and must NEVER start them:*

- **Chrome DevTools**: Chromium with remote debugging on port 9222 is always available.
- **Dev Server**: `npm run dev` is always running on port 3000.

Do not attempt to start Chromium, npm run dev, or any other server processes. If browser automation fails, report the error and ask the user to verify the services are running - do not try to start them yourself.

## Browser Verification with MCP

After completing code changes and CLI validation, automatically run browser verification:

1. Navigate to the relevant route: `mcp_chrome-devtools_navigate_page` to `http://localhost:3000`
2. Interact with the feature using `mcp_chrome-devtools_click`, `mcp_chrome-devtools_fill`, etc.
3. Capture state with `mcp_chrome-devtools_take_screenshot` and `mcp_chrome-devtools_take_snapshot`
4. Check for errors with `mcp_chrome-devtools_list_console_messages`
5. Report results to user with:
   - Test steps performed
   - Screenshots/snapshots captured
   - Any console errors or unexpected behavior
   - Request manual user validation

Chrome DevTools MCP connects to port 9222 which is assumed to be already running. If connection fails, ask the user to verify Chrome is running with remote debugging - do not attempt to start it.

## Chrome DevTools MCP

This project is configured with Chrome DevTools MCP (`.crush.json`) for browser automation.

### Connection

Chrome DevTools MCP connects to an existing Chromium instance on port 9222. The user is responsible for starting Chrome with remote debugging enabled. Do not attempt to start Chrome yourself.

### Available MCP Tools

All tools are prefixed with `mcp_chrome-devtools_`:

- **Navigation**: `navigate_page`, `new_page`, `close_page`, `list_pages`, `select_page`, `wait_for`
- **Input**: `click`, `fill`, `fill_form`, `hover`, `press_key`, `drag`, `handle_dialog`, `upload_file`
- **Debugging**: `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`
- **Performance**: `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
- **Network**: `list_network_requests`, `get_network_request`

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
