# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# HomeBench - Privacy-by-Design In-Browser SQL Workbench

## Project Overview
HomeBench is a privacy-by-design, analytical SQL workbench that runs entirely in the browser using DuckDB-WASM. No user data (files or queries) is ever transmitted to servers - all processing happens client-side.

## Architecture
- **Frontend**: Next.js with TypeScript, TailwindCSS, and shadcn/ui primitives
- **Database**: DuckDB-WASM for in-browser SQL analytics
- **Storage**: Origin Private File System (OPFS) for database persistence
- **Deployment**: Static site generation (SSG) for serverless hosting

## Key Technologies & Documentation
The `.docs_for_ai/` directory contains reference documentation for:
- **DuckDB**: CSV processing, C++ client integration, export functionality
- **DataFusion**: Alternative query engine, DataFrame API, profiling tools
- **Apache Arrow**: Columnar data format for high-performance analytics

## Development Commands

### Setup
```bash
npm install
npm run dev    # Starts with --turbopack for faster builds
```

### Build & Deploy
```bash
npm run build
npm start
```

### Code Quality
```bash
npm run lint
npm run typecheck
```

## UI System (shadcn/ui)
- **Primitives**: Reusable building blocks live in `components/ui/` (e.g., `Button.tsx`, `Dialog.tsx`, `DropdownMenu.tsx`, `Tabs.tsx`, `Separator.tsx`, `Switch.tsx`, `ScrollArea.tsx`, `Label.tsx`, `Collapsible.tsx`). Import via `@/components/ui/...`.
- **Aliases**: `components.json` sets aliases (`components: '@/components'`, `utils: '@/lib/utils'`) and enables RSC (`rsc: true`). Use `cn` from `@/lib/utils` for class composition.
- **File naming**: Keep primitive filenames in `PascalCase` to match the repo style (intentional deviation from shadcn defaults).
- **Theming**: Tailwind design tokens are driven by CSS variables in `app/globals.css` with extensions in `tailwind.config.js` (base color: `slate`, dark mode via `class`). Prefer tokens like `bg-background`, `text-foreground`, `muted`, `accent`, and `border` over hardcoded colors.
- **Variants**: Prefer component `variant` and `size` props over custom color classes when available. Use `className` for layout/spacing only.
- **RSC vs client**: Default to server components. Add `"use client"` only when interaction is required (menus, dialogs, toggles). Many primitives are usable server‑side; evented wrappers must be client components.
- **Adding components**: Use the shadcn CLI with the existing `components.json`. After generation, rename files to `PascalCase` to keep consistency.

### Testing
```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
```

## Core Features (Implemented)
1. **File Upload**: Register CSV/Parquet/JSON files with DuckDB virtual filesystem
2. **SQL Editor**: CodeMirror-based editor with SQL syntax highlighting and performance hints
3. **Query Execution**: Execute SQL against loaded datasets with automatic optimization
4. **Results Display**: AG Grid with virtualization for high-performance data visualization
5. **Data Export**: Export query results in various formats (CSV, Parquet, JSON)
6. **Session Persistence**: Full database snapshot saved to OPFS (includes uploaded data)
7. **Performance Monitoring**: Real-time performance metrics and query optimization
8. **Schema Explorer**: Interactive database schema browser with caching

## Key Implementation Notes

### DuckDB-WASM Setup
- Use `eh` bundle for best performance/compatibility balance
- Initialize as singleton in React Context
- Configure Next.js webpack for WebAssembly support

### Performance Optimizations
- **Query Optimization**: Automatic LIMIT injection for unbounded SELECT queries
- **Memory Management**: Real-time memory usage monitoring and warnings
- **Virtualization**: Row/column virtualization for large datasets in AG Grid
- **Caching**: Schema information caching with 5-second TTL
- **Debounced Input**: 150ms debounce on SQL editor to reduce re-renders
- **Parallel Loading**: Load table metadata in parallel for better performance
- **Smart Pagination**: Dynamic page sizes based on dataset characteristics
- Ingestion copies uploads into DuckDB tables (not zero-copy)
- Prefer Parquet format for better query performance
- Close connections and statements promptly

### Browser Limitations
- 4GB WebAssembly memory limit
- Single-threaded execution (experimental threading available)
- CORS required for remote data access
- No direct TCP/socket connections (PostgreSQL scanner unavailable)
- JSON files larger than 16MB may exceed DuckDB's `maximum_object_size` limit and fail to load

### Storage Strategy
- **OPFS**: Store full DuckDB database snapshot (`.duckdb`) of current session
- **IndexedDB**: Store metadata (saved queries, preferences, table tracking)
- **Ingestion**: Uploads are copied into DuckDB tables; data remains on-device

## Privacy Architecture
- **Zero Server Processing**: All data processing happens in browser
- **Local Storage Only**: Data never leaves user's device
- **Static Deployment**: No server-side runtime required
- **CORS-Only Remote**: Only HTTP-accessible data (with CORS headers)

## Testing
This project uses Vitest with jsdom environment for unit testing:
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- Tests are colocated with sources (e.g., `lib/*.test.ts`)
- Coverage reports generated with v8 provider
- Test setup in `test/setup.ts` includes fake-indexeddb and browser API polyfills

## Deployment
Static files can be deployed to any CDN:
- Vercel, Netlify, GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps

## Key Code Architecture

### Main Components
- `DuckDBProvider` (`contexts/DuckDBContext.tsx`): Singleton DuckDB-WASM instance with OPFS persistence
- `TabbedWorkbench` (`components/TabbedWorkbench.tsx`): Main UI orchestrating all features
- `FileUploader` (`components/FileUploader.tsx`): Ingests files and composes shadcn primitives for actions
- `SQLEditor` (`components/SQLEditor.tsx`): CodeMirror-based SQL editor with debounced input
- `ResultsGrid` (`components/ResultsGrid.tsx`): AG Grid virtualized results display
- `SchemaExplorer` (`components/SchemaExplorer.tsx`): Database schema browser with caching
- `PersistencePanel` (`components/PersistencePanel.tsx`): Session save/load management
- `UI primitives` (`components/ui/*`): shadcn/ui-based primitives (Button, Dialog, DropdownMenu, Tabs, Collapsible, etc.)

### Core Libraries  
- `/lib/performanceUtils.ts`: Query optimization and performance analysis
- `/lib/opfsUtils.ts`: Origin Private File System operations for database persistence
- `/lib/persistence.ts`: Session save/load functionality
- `/lib/exportUtils.ts`: Data export in multiple formats
- `/lib/queryStore.ts`: Saved queries management with IndexedDB (Dexie)
- `/lib/tableMetadataStore.ts`: Table metadata tracking with IndexedDB

### Next.js Configuration
- `next.config.js` enables `asyncWebAssembly` and configures webpack for DuckDB-WASM
- Outputs WASM files to `static/wasm/` directory
- Excludes DuckDB worker files on server-side rendering
 - Tailwind + shadcn configured via `tailwind.config.js`, `app/globals.css`, and `components.json`

## Future Enhancements
- Multi-threading support when stable
- Advanced visualizations with Observable Plot
- Multi-stage data pipeline builder
- Browser-based collaborative features
