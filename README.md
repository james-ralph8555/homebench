# HomeBench

<table>
  <tr>
    <td width="140" valign="middle">
      <img src="public/logo.png" alt="HomeBench logo" width="128" />
    </td>
    <td valign="middle">
      <p>
        A privacy-by-design in-browser SQL workbench powered by DuckDB-WASM. Analyze your data locally without ever sending it to a server.
      </p>
    </td>
  </tr>
  </table>

## 🔗 Try It Online

- Live demo: https://homebench.casa

## 📖 Usage

1. Upload data: CSV, Parquet, or JSON from your computer
2. Write SQL: Use the built-in editor with hints
3. Run query: Execute locally in your browser (DuckDB‑WASM)
4. View results: Explore in a fast, virtualized grid
5. Export/share: Download results (CSV, Parquet, JSON)
6. Persist session: Your database is saved to OPFS automatically

## ✨ Features

- **🔒 Privacy-by-Design**: All data processing happens in your browser - nothing is sent to servers
 - **⚡ High Performance**: Powered by DuckDB-WASM with query optimization
- **📊 Rich Data Support**: Works with CSV, Parquet, and JSON files
- **💾 Session Persistence**: Saves entire database snapshot to OPFS (includes uploaded data)
- **🌐 Serverless**: Deploy as static files to any CDN
- **📝 Full SQL Support**: Complete SQL analytics with intelligent editor and performance hints
- **📈 Performance Monitoring**: Query runtime and memory usage tracking
- **🗄️ Schema Explorer**: Interactive database schema browser with caching
- **⚙️ Auto-Optimization**: Automatic query optimization for better performance

## 🚀 Quick Start

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

## 📚 Technical Docs

- App architecture and non-functional details: `app/README.md`
- Components map and UI overview: `components/README.md`
- Engine and storage internals: `lib/README.md`
- Multi‑tab roles, transport, and streaming: `lib/multitab/README.md`

Mermaid diagrams and deep-dive technical content have been moved into these sub READMEs for clarity.

## 🛠️ Development

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

## 🔎 Technical Details

See `app/README.md` and `lib/README.md` for detailed architecture, implementation status, and non-functional behavior.

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
npm test             # Run unit tests (Vitest)
npm run test:watch   # Watch mode for tests
```

## 🧪 Testing

This repo uses Vitest with a `jsdom` environment to unit test browser-facing utilities in `lib/` with minimal mocking.

- Tests are colocated with sources (e.g., `lib/*.test.ts`).
- `test/setup.ts` loads `fake-indexeddb/auto` and adds small polyfills (e.g., `URL.createObjectURL`).
- Coverage reports are generated with the `v8` provider into `coverage/`.

## 📊 Performance

Performance optimizations and best practices are documented in `lib/README.md`.

## 🌐 Browser Support & Limitations

See `app/README.md` for supported browsers and current limitations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- [DuckDB](https://duckdb.org/) team for the amazing analytical database
- [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm) for browser support
- Next.js team for the excellent React framework

## 📚 Learn More

- DuckDB Documentation: https://duckdb.org/docs/
- Next.js Documentation: https://nextjs.org/docs
