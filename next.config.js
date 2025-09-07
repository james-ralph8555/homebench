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
  // Note: Headers for caching optimization must be configured at the CDN level
  // (CloudFlare/CloudFront) since this is a static export build.
  // Recommended headers for WASM files:
  // - Cache-Control: public, max-age=31536000, immutable
  // - Vary: Accept-Encoding
  experimental: {
    // Enable package import optimizations for better tree-shaking
    optimizePackageImports: ['@uiw/react-codemirror', 'ag-grid-community', 'apache-arrow'],
    // Enable runtime optimizations
    optimizeServerReact: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Enable WASM support with proper MIME types and compression
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Remove bundle-time compression; rely on CDN edge compression to avoid double compression

    // Ignore Node.js specific modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Rely on Next.js 15 defaults for optimization and chunking per REFACTOR.md

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
