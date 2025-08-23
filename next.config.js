const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  // Enable image optimization when not exporting
  images: {
    unoptimized: true,
  },
  // Enable compression and optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  experimental: {
    // Enable package import optimizations for better tree-shaking
    optimizePackageImports: ['@uiw/react-codemirror', 'ag-grid-community', 'apache-arrow'],
    // Enable runtime optimizations
    optimizeServerReact: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Ignore Node.js specific modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Optimize webpack configuration for production
    if (!dev && !isServer) {
      // Enable webpack tree shaking and dead code elimination
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Enable module concatenation for smaller bundles
      config.optimization.concatenateModules = true;
      
      // Enable aggressive splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        minRemainingSize: 0,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        enforceSizeThreshold: 50000,
        cacheGroups: {
          // Framework chunk (React, Next.js core)
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Separate DuckDB chunk due to its size
          duckdb: {
            test: /[\\/]node_modules[\\/]@duckdb[\\/]/,
            name: 'duckdb',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // UI libraries chunk
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|@uiw|ag-grid|apache-arrow)[\\/]/,
            name: 'ui-libs',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          // Common vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Common code between pages
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
            enforce: true,
          },
        },
      };

      // Enable performance hints and limits (adjusted for DuckDB-WASM)
      config.performance = {
        hints: 'warning',
        maxAssetSize: 2500000, // 2.5MB (DuckDB-WASM is large)
        maxEntrypointSize: 3000000, // 3MB
      };
    }

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);