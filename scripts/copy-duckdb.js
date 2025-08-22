const fs = require('fs');
const path = require('path');

const ver = require('../node_modules/@duckdb/duckdb-wasm/package.json').version;
const src = path.join('node_modules/@duckdb/duckdb-wasm/dist');
const dst = path.join('public/duckdb', ver);

fs.mkdirSync(dst, { recursive: true });

for (const f of ['duckdb-browser-eh.worker.js', 'duckdb-eh.wasm']) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}

console.log('Copied DuckDB assets to', dst);