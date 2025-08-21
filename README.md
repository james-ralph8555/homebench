# HomeBench

A privacy-first, in-browser SQL workbench powered by DuckDB-WASM. Analyze your data locally without ever sending it to a server.

## ✨ Features

- **🔒 Privacy-First**: All data processing happens in your browser - nothing is sent to servers
- **⚡ High Performance**: Powered by DuckDB-WASM for fast analytical queries
- **📊 Rich Data Support**: Works with CSV, Parquet, and JSON files
- **💾 Session Persistence**: Save and restore your work using browser storage
- **🌐 Serverless**: Deploy as static files to any CDN
- **📝 Full SQL Support**: Complete SQL analytics with a powerful editor

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

## 🏗️ Architecture

HomeBench is built on a modern, client-side architecture:

- **Frontend**: Next.js with TypeScript and TailwindCSS
- **Database**: DuckDB-WASM for in-browser SQL analytics  
- **Persistence**: Origin Private File System (OPFS) + IndexedDB
- **Deployment**: Static Site Generation for serverless hosting

## 📖 Usage

1. **Upload Data**: Select CSV, Parquet, or JSON files from your computer
2. **Write SQL**: Use the built-in editor to write analytical queries
3. **View Results**: Explore results in a high-performance data grid
4. **Export Data**: Download query results in multiple formats
5. **Save Session**: Your work is automatically saved to browser storage

## 🛠️ Development

### Project Structure

```
homebench/
├── app/                 # Next.js app router pages
├── components/          # React components
├── contexts/           # React context providers
├── lib/                # Utility functions
├── .docs_for_ai/       # AI assistant documentation
└── ARCH.md            # Detailed architecture guide
```

### Key Components

- `DuckDBProvider`: Manages the DuckDB-WASM instance
- `FileUploader`: Handles local file ingestion
- `SQLEditor`: CodeMirror-based SQL editor
- `Workbench`: Main query interface
- `ResultsGrid`: AG Grid for displaying query results

### WebAssembly Configuration

The project includes special Next.js configuration for DuckDB-WASM:

```javascript
// next.config.js
config.experiments = {
  asyncWebAssembly: true,
};
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
```

## 📊 Performance Tips

- **Use Parquet files** for best query performance
- **Limit large result sets** with SQL LIMIT clauses
- **Close connections** promptly to free memory
- **Monitor memory usage** - browser limit is ~4GB

## 🌐 Browser Support

- Chrome/Edge 86+ (recommended)
- Firefox 89+ 
- Safari 15+

Requires WebAssembly and modern JavaScript features.

## 🚀 Deployment

HomeBench generates static files that can be deployed anywhere:

### Vercel
```bash
vercel deploy
```

### Netlify
```bash
netlify deploy --prod --dir=out
```

### GitHub Pages
Enable GitHub Pages in your repository settings and push to `gh-pages` branch.

## 📋 Limitations

- **Memory**: Limited by browser WebAssembly limits (~4GB)
- **Remote Data**: Requires CORS headers for HTTP-accessible files
- **PostgreSQL**: Direct database connections not supported (browser security)
- **Threading**: Single-threaded by default (experimental multi-threading available)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [DuckDB](https://duckdb.org/) team for the amazing analytical database
- [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm) for browser support
- Next.js team for the excellent React framework

## 📚 Learn More

- [Architecture Guide](./ARCH.md) - Detailed technical architecture
- [DuckDB Documentation](https://duckdb.org/docs/) - SQL reference
- [Next.js Documentation](https://nextjs.org/docs) - Framework guide