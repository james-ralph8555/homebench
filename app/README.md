# App Architecture

HomeBench is a client-only Next.js application (App Router) that runs DuckDB entirely in the browser (WebAssembly + Web Worker). All data and state remain on-device.

- Frontend: Next.js (App Router) + TypeScript + TailwindCSS
- Database: DuckDB‑WASM in a Web Worker (bundle selected at runtime)
- Persistence: OPFS stores the DuckDB database; IndexedDB stores saved queries and table metadata
- Deployment: Static export + CDN; no server required

## System Diagram

```mermaid
flowchart LR
  A[UI Components\nNext.js + React] -->|queries| O(Operations\nlib/durableOperations)
  O --> M(DuckDBManager)
  M -->|leader| B(DuckDB-WASM\nWeb Worker)
  M -->|client\nproxy| L[Leader Tab]
  L --> B
  B -->|"results (Arrow/JSON)"| O
  O --> A
  A -->|"auto-save/restore"| C[OPFS\nhomebench.db]
  A -->|"saved queries"| D[IndexedDB\nDexie]
  A -->|metadata| E[IndexedDB\nTable Metadata]
  A -->|"file handles"| F[(Browser File APIs)]
  F -->|"register/read*"| B

  classDef store fill:#f6f8fa,stroke:#c9d1d9,color:#24292f
  class C,D,E store
```

## Non-Functional Requirements

- Privacy-by-design: All processing happens in-browser; no server calls.
- Serverless: Ships as static assets; no backend to deploy or operate.
- Persistence: Session state saved to OPFS; queries/metadata saved to IndexedDB.
- Multi‑tab safety: Single‑leader tab owns DuckDB; clients proxy queries via the multi‑tab transport.
- Performance: Virtualized grids, query hints, and memory usage monitoring.

## Browser Support

- Chrome/Edge 86+
- Firefox 111+
- Safari 15.2+

Requires WebAssembly and modern JavaScript features. If OPFS is unavailable, the app runs in memory (no persistence), and client tabs will degrade capabilities accordingly.

## Limitations

- Memory: Constrained by browser WebAssembly limits (~4GB typical upper bound).
- JSON size: DuckDB’s default `maximum_object_size` is 16MB; ingestion raises this to 100MB for `read_json_auto`, but very large objects can still fail.
- Remote data: Requires appropriate CORS headers.
- DB connections: Direct server DB connections are not supported in-browser.
- Threading: Single‑threaded by default; multi‑threading is experimental.
- File uploads: Require the leader tab (direct DB handle) to register file handles.

## WebAssembly + Next.js Config

- Static export: `next.config.js` uses `output: 'export'` and `trailingSlash: true` for CDN‑friendly hosting.
- Optimizations: Package import and chunking optimizations are enabled for UI libs and DuckDB‑WASM.
- WASM loading: DuckDB‑WASM runs in a Web Worker; bundles are selected at runtime in `lib/duckdbManager.ts`. No custom `asyncWebAssembly` flag is required in the current setup.
- Assets: The manager references bundle paths under `/duckdb/<version>`. Ensure these assets are hosted alongside the app or adjust the URLs in `getDuckDbBundle()`.

## Entry Points

- `app/layout.tsx`: Root layout, fonts, and providers.
- `app/page.tsx`: Home route hosting the workbench.
- `contexts/DuckDBContext.tsx`: Integrates with `DuckDBManager`; only the leader holds a `db` instance. Clients see `db = null` and use manager/ops to query.

## Query Orchestration

All querying flows through `lib/durableOperations` and `DuckDBManager`:

```mermaid
sequenceDiagram
  participant UI as SQLEditor/Components
  participant Ops as durableOperations
  participant M as DuckDBManager
  participant MT as Multi-Tab Transport
  participant LD as Leader DuckDB

  UI->>Ops: executeReadQuery / executeDurableWrite
  Ops->>M: executeQuery / executeStreamingQuery
  alt Leader tab
    M->>LD: connect + query
    LD-->>M: Arrow/JSON
  else Client tab
    M->>MT: send SqlRequest (stream)
    MT->>LD: route to leader
    LD-->>MT: Arrow chunks / JSON batches
    MT-->>M: stream responses
  end
  M-->>Ops: streamed results
  Ops-->>UI: render grid/hints/metrics
```
