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

1. Upload data: CSV, Parquet, or JSON from your computer
2. Write SQL: Use the built-in editor with hints
3. Run query: Execute locally in your browser (DuckDB‑WASM)
4. View results: Explore in a fast, virtualized grid
5. Visualize: Create charts from your query results
6. Export/share: Download results (CSV, Parquet, JSON)
7. Persist session: Your database is saved to OPFS automatically

New to DuckDB SQL? Start here: https://duckdb.org/docs/stable/sql/introduction

## Core Features (Implemented)

- **Privacy by design**: All data stays on your device; nothing is sent to a server
- **High-performance analytics**: Run SQL over millions of rows at interactive speeds using DuckDB-WASM
- **Multiple data formats**: Import and join CSV, Parquet, and JSON files using standard SQL
- **Persistent sessions**: Full database snapshots saved to Origin Private File System (OPFS)
- **Multi-tab support**: Single-writer lock mechanism enables concurrent multi-tab usage
- **Virtualized results grid**: AG Grid with row/column virtualization for smooth performance on large datasets
- **Real-time performance monitoring**: Query optimization with automatic LIMIT injection and memory usage tracking
- **Interactive schema explorer**: Database schema browser with caching for quick navigation
- **Data export**: Export query results in CSV, Parquet, and JSON formats
- **Visualization**: Generate charts from query results using Plotly.js
- **Zero setup**: Static site generation for serverless hosting - just open and start querying

## Roadmap (P06 — HomeBench)

Status legend: [Done], [Partial], [Planned]

### High-Impact Improvements (Priority)

#### Robust Import Pipeline & Schema Handling: [Partial]
- **Current**: Drag-drop upload with basic schema preview and progress messaging
- **Missing**: Pre-import schema preview with type overrides, cancel functionality during ingestion
- **Impact**: Improves first-time user experience when loading data; builds confidence in data handling

#### Persistent "Saving" Indicator & Write Durability: [Planned]
- **Current**: UI has isSaving indicator but not wired to durable writes
- **Missing**: Visual feedback tied to write queue, confirmation toast on successful commit, write-ahead log with recovery
- **Impact**: Builds user trust that work won't be lost; prevents data loss on unexpected app closure

#### Excel Import/Export Support: [Planned]
- **Current**: CSV, Parquet, JSON support
- **Missing**: .xlsx import and export capabilities
- **Impact**: Expands usefulness to broader audience without manual format conversion

#### External Data Connectors: [Planned]
- **Current**: Local file upload only
- **Missing**: HTTP(S) data source support, URL-based CSV/Parquet loading, optional caching
- **Impact**: Enables analysis of remote datasets without manual download steps

### Quick Wins
- Virtualized data grid for previews (>50k rows feel instant); sticky headers + column filters: [Done]
  - Results grid uses AG Grid with virtualization and column filters; preview table uses sticky headers (first 100 rows).

### Reliability (big one)
- Single‑writer across tabs: leader election + `navigator.locks`; readers unblocked: [Done]
  - Multi‑tab system implements leader election, heartbeats, and serialized writes; reads are concurrent.
- Durable write log in OPFS with tx replay (“Recovered 1 pending write”): [Planned]
  - No write‑ahead log or replay on startup yet.

### Power Features
- EXPLAIN/EXPLAIN ANALYZE pane with operator flame graph: [Planned]
- Snippets & notebook cells with markdown; export `.duckdb` + `.homebench` bundle: [Planned]
- UDFs (JS/WASM) for lightweight transforms; per‑session sandbox: [Planned]
- Data connectors: http(s) CSV/Parquet via httpfs + OPFS caching toggle (“pin file locally”): [Planned]
- Shareable read‑only workspace: export zip with OPFS files + `workspace.json`: [Planned]

### Performance Optimizations
- **Lazy-load DuckDB engine**: Load only when query editor first mounts to reduce initial load time: [Planned]
  - Current: DB initializes in the root layout provider
- **Streaming result sets**: Move heavy work to dedicated Worker with back-pressure control: [Partial]
  - DuckDB runs in Web Worker; multi-tab streaming (Arrow/JSON) exists; UI still uses non-streaming reads by default
- **Smart resource management**: Pre-warm OPFS + WASM on idle to hide first-query costs: [Planned]
- **Memory optimization**: Real-time memory usage monitoring with automatic cleanup: [Done]

### Success Metrics
- Track time‑to‑first‑query, failed‑write rate, and % sessions with successful import→query→export: [Planned]

## Planned Features

### Data Integration & Import
- **Excel import/export**: Full .xlsx support for broader compatibility
- **Remote data sources**: HTTP(S) CSV/Parquet loading with URL-based ingestion
- **Cloud storage connectors**: AWS S3, Google Cloud Storage integration
- **Session import**: Load existing .duckdb files to restore previous work
- **Advanced file handling**: Support for compressed files (gzip, brotli)
- **Schema validation**: Pre-import data type validation and suggestion

### Query & Analysis Features  
- **Advanced SQL editor**: Full DuckDB syntax support with autocomplete and validation
- **Query performance analysis**: EXPLAIN/EXPLAIN ANALYZE with operator flame graphs
- **Saved queries & snippets**: Query library with categorization and search
- **Notebook-style cells**: Markdown cells mixed with SQL for documentation
- **Custom functions**: User-defined functions (UDFs) in JavaScript/WASM
- **Query optimization hints**: Automatic suggestions for performance improvements

### Collaboration & Sharing
- **Shareable workspaces**: Export workspace as zip with OPFS files + metadata
- **Read-only sharing**: Generate shareable links to query results and visualizations
- **Session export/import**: Bundle complete workspace state for collaboration
- **Public dataset catalog**: Curated collection of example datasets

### Visualization & Reporting
- **Advanced charting**: Enhanced chart types beyond basic Plotly.js integration  
- **Dashboard builder**: Multi-chart dashboards with interactive filters
- **Data profiling**: Automatic data quality assessment and statistics
- **Export formats**: Extended export options including Excel, PDF reports

### Performance & Reliability
- **Multi-threading**: Leverage WebAssembly threading when stable
- **Write-ahead logging**: Durable transaction log with automatic recovery
- **Background sync**: Periodic backup to cloud storage (optional)
- **Performance benchmarking**: Built-in dataset and query performance testing

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
- `SQLEditor` (`components/SQLEditor.tsx`): CodeMirror-based SQL editor with debounced input
- `ResultsGrid` (`components/ResultsGrid.tsx`): AG Grid virtualized results display
- `SchemaExplorer` (`components/SchemaExplorer.tsx`): Database schema browser with caching

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
