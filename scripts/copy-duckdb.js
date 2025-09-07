const fs = require('fs');
const path = require('path');
// Optional precompression toggle (off by default to avoid double compression at CDN)
const PRECOMPRESS_WASM = process.env.PRECOMPRESS_WASM === 'true';

const ver = require('../node_modules/@duckdb/duckdb-wasm/package.json').version;
const src = path.join('node_modules/@duckdb/duckdb-wasm/dist');

// Always write to public/. Next export will copy these into out/ for deploy.
const dst = path.join('public', 'duckdb', ver);

fs.mkdirSync(dst, { recursive: true });

/**
 * Copy file and (optionally) generate compressed versions
 */
async function copyFileWithCompression(filename) {
  const srcFile = path.join(src, filename);
  const dstFile = path.join(dst, filename);
  
  // Copy original file
  fs.copyFileSync(srcFile, dstFile);
  console.log(`Copied ${filename}`);

  // Avoid generating .br/.gz by default; rely on CDN edge compression.
  // If explicitly requested, precompress WASM only.
  if (PRECOMPRESS_WASM && filename.endsWith('.wasm')) {
    try {
      const { createBrotliCompress, constants, createGzip } = require('zlib');
      const { pipeline } = require('stream');
      const { promisify } = require('util');
      const pipelineAsync = promisify(pipeline);

      await pipelineAsync(
        fs.createReadStream(srcFile),
        createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
        fs.createWriteStream(dstFile + '.br')
      );
      console.log(`Generated ${filename}.br (PRECOMPRESS_WASM)`);

      await pipelineAsync(
        fs.createReadStream(srcFile),
        createGzip({ level: 6 }),
        fs.createWriteStream(dstFile + '.gz')
      );
      console.log(`Generated ${filename}.gz (PRECOMPRESS_WASM)`);
    } catch (error) {
      console.warn(`Optional WASM precompression failed for ${filename}:`, error?.message || error);
    }
  }
}

async function main() {
  console.log(`Copying DuckDB assets to ${dst} (public dir)`);
  
  const files = ['duckdb-browser-eh.worker.js', 'duckdb-eh.wasm'];
  
  for (const filename of files) {
    await copyFileWithCompression(filename);
  }
  
  console.log(`Successfully copied ${files.length} DuckDB assets${PRECOMPRESS_WASM ? ' with optional precompression' : ''}`);
}

main().catch(error => {
  console.error('Failed to copy DuckDB assets:', error);
  process.exit(1);
});
