# AI Coding Agent Documentation Library

This directory, `.docs_for_ai/`, serves as a local documentation library for AI coding agents


### Core Technologies
- **`datafusion/`**: Apache DataFusion query engine documentation
  - `building-logical-plans.md`: Creating custom logical plans
  - `dataframe.md`: DataFrame API usage
  - `data_types.md`: Supported data types and schemas
  - `profiling.md`: Performance profiling and optimization
  - `using-the-dataframe-api.md`: API reference

- **`duckdb/`**: DuckDB analytical database documentation
  - `clients/cpp.md`: C++ client library usage
  - `csv-export.md`: CSV export functionality
  - `csv-overview.md`: CSV reading and processing

- **`arrow/`**: Apache Arrow format documentation
  - `cpp/`: C++ Arrow library docs
  - `python/`: Python Arrow bindings

- **`polars/`**: Polars DataFrame library documentation
  - Complete API reference for potential alternative implementations

### For DataFusion (Rust) Changes
- Reference `datafusion/data_types.md` for schema definitions
- Use `datafusion/profiling.md` for performance optimization
- Check `datafusion/dataframe.md` for API patterns

### For DuckDB (C++) Changes  
- Reference `duckdb/clients/cpp.md` for C++ integration
- Use `duckdb/csv-overview.md` for CSV processing optimization
- Check `duckdb/csv-export.md` for output formatting

## Versioning and Maintenance

- **Single Version:** Only one version of the documentation for a specific tool should be present at any given time.
- **Keep Current:** Documentation should match the versions used in the project implementations.
- **Project Alignment:** When updating implementations, refresh corresponding documentation to match.
