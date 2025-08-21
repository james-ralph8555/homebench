/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Required for DuckDB-WASM to work
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';

    // Rule to handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[contenthash][ext]',
      },
    });

    // Ignore DuckDB worker files on the server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js': 'commonjs @duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
      });
    }

    // Ignore Node.js specific modules on client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;