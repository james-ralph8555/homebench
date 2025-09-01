# HomeBench · v0.0.1 (pre‑alpha)

<table>
  <tr>
    <td width="140" valign="middle">
      <img src="public/logo-original.png" alt="HomeBench logo" width="128" />
    </td>
    <td valign="middle">
      <p>
        A privacy-by-design in-browser SQL workbench powered by DuckDB-WASM. Analyze your data locally without ever sending it to a server.
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

## Features

- Privacy by default: All data stays on your device; nothing is sent to a server.
- Fast on large data: Run SQL over millions of rows at interactive speeds in your browser, powered by DuckDB‑WASM.
- Flexible formats: Open CSV, Parquet, and JSON; join multiple files using standard SQL.
- Saved sessions: Your database persists to the browser’s file system (OPFS) so your work is there when you return.
- Rich results viewer: Virtualized grid for smooth scrolling, quick inspection, and export to CSV/Parquet/JSON.
- Visualization: Generate charts from your query results using Plotly.js.
- Zero setup: Works as a static site; just open and start querying.

## Roadmap (P06 — HomeBench)

Status legend: [Done], [Partial], [Planned]

### Quick Wins
- Import pipeline UX: drag‑drop → schema preview → COPY with type overrides; progress + cancel: [Partial]
  - Implemented: drag‑drop upload and post‑import schema preview; progress messaging.
  - Missing: pre‑copy schema preview, type overrides, cancel during ingest.
- “Saving…” indicator wired to a write queue; toast on durable commit: [Planned]
  - UI has an isSaving indicator, but it is not yet wired to durable writes; no commit toast.
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

### Performance
- Lazy‑load DuckDB bundle only when first editor mounts: [Planned]
  - Current: DB initializes in the root layout provider.
- Move heavy work to a dedicated Worker; stream results with back‑pressure: [Partial]
  - DuckDB runs in a Web Worker; multi‑tab streaming (Arrow/JSON) exists; UI paths still use non‑streaming reads by default.
- Pre‑warm OPFS + WASM on idle (`requestIdleCallback`) to hide first‑query costs: [Planned]

### Success Metrics
- Track time‑to‑first‑query, failed‑write rate, and % sessions with successful import→query→export: [Planned]

## Planned Features

- Excel import/export
- AWS + URL file ingestion
- Full DuckDB syntax support in the editor
- Import session from DuckDB file

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

## Technical Docs

- App architecture and non-functional details: `app/README.md`
- Components map and UI overview: `components/README.md`
- Engine and storage internals: `lib/README.md`
- Multi‑tab roles, transport, and streaming: `lib/multitab/README.md`

For implementation details and current limitations by area, see:
- Multi‑tab + durability: `lib/multitab/*`, `lib/durableOperations.ts`, `lib/opfsUtils.ts`
- Import pipeline: `components/FileUploader.tsx`, `components/DataPreview.tsx`
- Results grid: `components/ResultsGrid.tsx`

Mermaid diagrams and deep-dive technical content have been moved into these sub READMEs for clarity.

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

## Technical Details

See `app/README.md` and `lib/README.md` for detailed architecture, implementation status, and non-functional behavior.

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
