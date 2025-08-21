# HomeBench - Privacy-First In-Browser SQL Workbench

## Project Overview
HomeBench is a privacy-first, analytical SQL workbench that runs entirely in the browser using DuckDB-WASM. No user data (files or queries) is ever transmitted to servers - all processing happens client-side.

## Architecture
- **Frontend**: Next.js with TypeScript and TailwindCSS
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
npm run dev
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
- **Connection Pool**: Reuse DuckDB connections with configurable pool size
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
Look for existing test scripts in package.json. Common patterns:
- `npm test` or `npm run test`
- `jest` for unit testing
- `cypress` or `playwright` for e2e testing

## Deployment
Static files can be deployed to any CDN:
- Vercel, Netlify, GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps

## Future Enhancements
- Multi-threading support when stable
- Advanced visualizations with Observable Plot
- Multi-stage data pipeline builder
- Browser-based collaborative features
