const fs = require('fs');
const path = require('path');
const { createBrotliCompress, createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

const ver = require('../node_modules/@duckdb/duckdb-wasm/package.json').version;
const src = path.join('node_modules/@duckdb/duckdb-wasm/dist');

// Support both development (public/) and production (out/) destinations
const isDev = process.argv.includes('--dev') || !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const baseDir = isDev ? 'public' : 'out';
const dst = path.join(baseDir, 'duckdb', ver);

fs.mkdirSync(dst, { recursive: true });

/**
 * Copy file and generate compressed versions
 */
async function copyFileWithCompression(filename) {
  const srcFile = path.join(src, filename);
  const dstFile = path.join(dst, filename);
  
  // Copy original file
  fs.copyFileSync(srcFile, dstFile);
  console.log(`✓ Copied ${filename}`);
  
  // Skip compression for large WASM files in development to speed up dev server startup
  if (isDev && filename.endsWith('.wasm')) {
    console.log(`⚡ Skipping compression for ${filename} in development mode`);
    return;
  }
  
  // Use lower compression for faster processing, with timeout
  const compressionTimeout = 30000; // 30 seconds
  
  // Generate Brotli compression (.br)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), compressionTimeout);
    
    await pipelineAsync(
      fs.createReadStream(srcFile),
      createBrotliCompress({ 
        params: { 
          [require('zlib').constants.BROTLI_PARAM_QUALITY]: filename.endsWith('.wasm') ? 6 : 11 
        }
      }),
      fs.createWriteStream(dstFile + '.br')
    );
    
    clearTimeout(timeoutId);
    console.log(`✓ Generated ${filename}.br`);
  } catch (error) {
    if (error.code === 'ABORT_ERR') {
      console.warn(`⚠ Brotli compression timeout for ${filename} (skipping)`);
    } else {
      console.warn(`⚠ Failed to generate ${filename}.br:`, error.message);
    }
  }
  
  // Generate Gzip compression (.gz)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), compressionTimeout);
    
    await pipelineAsync(
      fs.createReadStream(srcFile),
      createGzip({ level: filename.endsWith('.wasm') ? 6 : 9 }),
      fs.createWriteStream(dstFile + '.gz')
    );
    
    clearTimeout(timeoutId);
    console.log(`✓ Generated ${filename}.gz`);
  } catch (error) {
    if (error.code === 'ABORT_ERR') {
      console.warn(`⚠ Gzip compression timeout for ${filename} (skipping)`);
    } else {
      console.warn(`⚠ Failed to generate ${filename}.gz:`, error.message);
    }
  }
}

async function main() {
  console.log(`📦 Copying DuckDB assets to ${dst} (${isDev ? 'development' : 'production'} mode)`);
  
  const files = ['duckdb-browser-eh.worker.js', 'duckdb-eh.wasm'];
  
  for (const filename of files) {
    await copyFileWithCompression(filename);
  }
  
  console.log(`🎉 Successfully copied ${files.length} DuckDB assets with compression`);
}

main().catch(error => {
  console.error('❌ Failed to copy DuckDB assets:', error);
  process.exit(1);
});