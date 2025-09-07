# HomeBench · v0.0.1 (pre‑alpha)

<table>
  <tr>
    <td width="140" valign="middle">
      <img src="public/logo-original.png" alt="HomeBench logo" width="128" />
    </td>
    <td valign="middle">
      <p>
        A privacy-by-design, analytical SQL workbench that runs entirely in the browser using DuckDB-WASM. No user data (files or queries) is ever transmitted to servers - all processing happens client-side. Import local files, run SQL queries on millions of rows, and leverage multi-tab concurrency with persistent sessions stored in your browser's file system.
      </p>
    </td>
  </tr>
  </table>

> Pre‑alpha notice: Expect breaking changes, instability, and potential data loss. OPFS persistence may fail on some browsers; do not rely on this version for critical data.

## [Try It Online](https://homebench.casa)

## Usage

1. Upload data: CSV, Parquet, JSON, or Excel (.xlsx) from your computer
2. Write SQL: Use the built-in editor with hints
3. Run query: Execute locally in your browser (DuckDB‑WASM)
4. View results: Explore in a fast, virtualized grid
5. Visualize: Create charts from your query results
6. Export/share: Download results (CSV, Parquet, JSON)
7. Persist session: Your database is saved to OPFS automatically

New to DuckDB SQL? Start here: https://duckdb.org/docs/stable/sql/introduction

### Explain / Analyze
- Use the `Explain` button to run `EXPLAIN <your query>` and inspect the textual execution plan.
- Use the `Analyze` button to run `EXPLAIN ANALYZE <your query>` and see profiled timings. The app also attempts to parse DuckDB's JSON explain output when available.
  - Visual flame graphs are not included; profiling is presented as textual plans (with optional JSON parsing when available).

## Core Features (Implemented)

- **Privacy by design**: All data stays on your device; nothing is sent to a server
- **High-performance analytics**: Run SQL over millions of rows at interactive speeds using DuckDB-WASM
- **Multiple data formats**: Import and join CSV, Parquet, JSON, and Excel (.xlsx)
- **Persistent sessions**: Full database snapshots saved to Origin Private File System (OPFS)
- **Multi-tab support**: Single-writer lock mechanism enables concurrent multi-tab usage
- **Virtualized results grid**: AG Grid with row/column virtualization for smooth performance on large datasets
- **Real-time performance monitoring**: Query optimization with automatic LIMIT injection and memory usage tracking
- **Interactive schema explorer**: Database schema browser with caching for quick navigation
- **Data export**: Export query results in CSV, Parquet, and JSON formats
- **Visualization**: Generate charts from query results using Plotly.js
- **Refined UI**: shadcn/ui-based interface with inline schema preview, polished menus, and consolidated panels
- **Zero setup**: Static site generation for serverless hosting - just open and start querying

## Roadmap

- **Excel export**: Export query results to Excel/XLSX format
- External data connectors: HTTP(S) CSV/Parquet with optional caching
- Advanced import controls: CSV options, date/time hints, multi-file/partitioned ingest, progress + cancel
- Streaming results by default in UI (Arrow/JSON with back-pressure)
- Smart resource management: idle pre-warm of OPFS/WASM
- Shareable workspaces: export zip with OPFS files + metadata
- Notebook-style cells and snippets; saved query library
- User-defined functions (JS/WASM) for lightweight transforms
- Dashboard builder and advanced charting
- Success metrics for core flows (import → query → export)

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
git clone https://github.com/yourusername/homebench.git
cd homebench
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Technical Documentation

### Architecture Overview
- **App architecture**: Next.js with TypeScript, TailwindCSS, and shadcn/ui primitives
- **Database engine**: DuckDB-WASM for in-browser SQL analytics
- **Storage layer**: Origin Private File System (OPFS) for database persistence
- **UI framework**: React with server-side generation for static deployment

### Key Implementation Areas

#### Core System Components
- `DuckDBProvider` (`contexts/DuckDBContext.tsx`): Singleton DuckDB-WASM instance with OPFS persistence
- `TabbedWorkbench` (`components/TabbedWorkbench.tsx`): Main UI orchestrating all features
- `FileUploader` (`components/FileUploader.tsx`): File ingestion with shadcn/ui components
- `SchemaPreviewInline` (`components/SchemaPreviewInline.tsx`): Inline schema detection and type override workflow with live converted sample preview (uses `lib/durableOperations.executeReadQuery` with `TRY_CAST`).
- `SQLEditor` (`components/SQLEditor.tsx`): CodeMirror-based SQL editor with debounced input
- `ResultsGrid` (`components/ResultsGrid.tsx`): AG Grid virtualized results display
- `SchemaExplorer` (`components/SchemaExplorer.tsx`): Database schema browser with caching

#### Initialization Lifecycle
- Context state: `DuckDBProvider` exposes `initializationStage: 'not_started' | 'loading' | 'ready' | 'error'` and a computed `isReady`.
- UI gating: Components use `isReady` to guard DB operations and adjust affordances:
  - `FileUploader`: Disables dropzone/input while DB loads; shows status message.
  - `SchemaExplorer`: Shows a small loading/error placeholder until ready.
  - `TabbedWorkbench`: Shows a lightweight status indicator (loading/error) without blocking the UI.
- Backward compatibility: Existing `isLoading` and `error` remain; prefer `initializationStage`/`isReady` in new code.

#### Engine & Storage Libraries
- `/lib/performanceUtils.ts`: Query optimization and performance analysis
- `/lib/opfsUtils.ts`: Origin Private File System operations
- `/lib/persistence.ts`: Session save/load functionality  
- `/lib/exportUtils.ts`: Data export in multiple formats
- `/lib/queryStore.ts`: Saved queries management with IndexedDB (Dexie)
- `/lib/tableMetadataStore.ts`: Table metadata tracking with IndexedDB

#### Multi-tab Architecture
- `lib/multitab/`: Leader election, heartbeats, and serialized writes
- Single-writer lock mechanism with concurrent reads
- Cross-tab communication and state synchronization

### Configuration & Setup
- **Next.js config** (`next.config.js`): WebAssembly support, WASM file routing
- **Webpack configuration**: DuckDB-WASM integration, worker file exclusions
- **Tailwind + shadcn/ui**: `tailwind.config.js`, `app/globals.css`, `components.json`

### Browser Limitations & Compatibility
- 4GB WebAssembly memory limit
- Single-threaded execution (experimental threading available)
- CORS required for remote data access
- No TCP/socket connections (PostgreSQL scanner unavailable)
- JSON files >16MB may exceed DuckDB's `maximum_object_size` limit

For detailed technical specifications, see the individual component and library documentation.

## Troubleshooting

- Database write capability corrupted: If you see an error like “Database write capability corrupted…”, first refresh the page and retry. If it persists, open Settings → Storage and use “Clear OPFS data”, then reload the app and re‑import your files. This clears the local database files stored in your browser.

## Development

### Project Structure

```
homebench/
├── app/                # Next.js App Router (see app/README.md)
├── components/         # React components (see components/README.md)
├── contexts/           # React context providers
├── lib/                # Engine + persistence (see lib/README.md)
├── .docs_for_ai/       # AI assistant documentation
└── README.md           # Project overview
```

## Additional Technical Resources

- **AI Assistant Documentation**: `.docs_for_ai/` contains reference docs for DuckDB, DataFusion, and Apache Arrow
- **Component Documentation**: Individual README files in `app/`, `components/`, and `lib/` directories  
- **Implementation Status**: Detailed architecture and non-functional behavior specifications
- **Testing Strategy**: Vitest configuration with jsdom environment and browser API polyfills

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
npm test             # Run unit tests (Vitest)
npm run test:watch   # Watch mode for tests
```

## Testing

This repo uses Vitest with a `jsdom` environment to unit test browser-facing utilities in `lib/` with minimal mocking.

- Tests are colocated with sources (e.g., `lib/*.test.ts`).
- `test/setup.ts` loads `fake-indexeddb/auto` and adds small polyfills (e.g., `URL.createObjectURL`).
- Coverage reports are generated with the `v8` provider into `coverage/`.

## Browser Support & Limitations

See `app/README.md` for supported browsers and current limitations.

## Acknowledgments

- [DuckDB](https.duckdb.org/) team for the amazing analytical database
- [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm) for browser support
- Next.js team for the excellent React framework

## Learn More

- DuckDB Documentation: https://duckdb.org/docs/
- Next.js Documentation: https://nextjs.org/docs
