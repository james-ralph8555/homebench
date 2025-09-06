# CDN Optimization Guide for HomeBench WASM Caching

This guide provides specific configuration instructions for optimizing DuckDB WASM file delivery through your CDN stack, based on the comprehensive performance analysis.

## 🎯 Quick Summary of Implemented Client-Side Optimizations

✅ **Already Implemented in This Build:**
- Brotli and Gzip compression for WASM files (32MB → ~8-10MB compressed)
- WebAssembly streaming compilation with retry logic
- Progressive loading UI with detailed progress indicators  
- Preload hints for critical WASM assets
- Optimized webpack chunking and bundle splitting

## 🌐 Required CDN-Level Configuration

Since HomeBench uses static export (`output: 'export'`), optimal caching headers must be configured at your CDN level.

### CloudFront Configuration

**1. Create Cache Policy for WASM Assets**
```json
{
  "Name": "HomeBench-WASM-Static-Assets-Policy",
  "Comment": "Policy for long-lived, versioned WASM assets. Caches based on path and compression only.",
  "DefaultTTL": 86400,
  "MaxTTL": 31536000,
  "MinTTL": 1,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "QueryStringsConfig": {
      "QueryStringBehavior": "none"
    },
    "HeadersConfig": {
      "HeaderBehavior": "none"
    },
    "CookiesConfig": {
      "CookieBehavior": "none"
    }
  }
}
```

**2. Cache Behavior Configuration**
- **Path Pattern:** `/duckdb/*/*.wasm`
- **Cache Policy:** HomeBench-WASM-Static-Assets-Policy
- **Origin Request Policy:** CORS-S3Origin (or create custom without volatile headers)
- **Compress Objects Automatically:** Yes

**3. Response Headers Policy** (Optional but recommended)
```json
{
  "Name": "HomeBench-WASM-Headers",
  "CustomHeaders": {
    "cache-control": {
      "Header": "Cache-Control",
      "Value": "public, max-age=31536000, immutable",
      "Override": true
    },
    "vary": {
      "Header": "Vary", 
      "Value": "Accept-Encoding",
      "Override": false
    }
  }
}
```

### Cloudflare Configuration

**1. Page Rules** (for paths `/duckdb/*/*.wasm` and `/duckdb/*/*.js`)
- **Cache Level:** Cache Everything
- **Edge Cache TTL:** 1 year
- **Browser Cache TTL:** 1 year

**2. Transform Rules** (Custom Headers)
```yaml
Expression: (http.request.uri.path contains "/duckdb/" and (ends_with(http.request.uri.path, ".wasm") or ends_with(http.request.uri.path, ".js")))
Action: Add Response Header
Header Name: Cache-Control
Value: "public, max-age=31536000, immutable"
```

**3. Compression Settings**
- **Auto Minify:** JavaScript: On, CSS: On, HTML: On  
- **Brotli:** On

**Important:** Ensure "Origin Cache Control" is **ON** to respect CloudFront headers.

## 📊 Expected Performance Improvements

### Before Optimization
- **32MB WASM file downloaded on every page load**
- **Load time:** 15-45 seconds on slower connections
- **Bounce rate impact:** ~32% increase from 1s to 3s load time

### After Full Implementation
- **First visit:** 8-10MB compressed download with streaming compilation
- **Subsequent visits:** Instant load from browser cache
- **Load time improvement:** 60-80% reduction for repeat visitors
- **CDN hit ratio:** >95% for static WASM assets

## 🧪 Verification & Testing

### Test CDN Configuration
```bash
# Test caching headers
curl -I https://your-domain.com/duckdb/1.29.1-dev269.0/duckdb-eh.wasm

# Expected headers:
# cache-control: public, max-age=31536000, immutable
# vary: Accept-Encoding
# content-encoding: br (or gzip)
```

### Browser DevTools Verification
1. **First load:** Check Network tab for compressed file size
2. **Reload page:** Verify WASM loads from cache (size: "disk cache")
3. **Check compression:** Response headers should show `content-encoding: br`

### CloudFront Cache Statistics
Monitor your CloudFront distribution for:
- **Cache Hit Ratio:** Should be >90% for WASM files after initial traffic
- **Origin Request Rate:** Should drop significantly for WASM assets
- **Error Rate:** Should remain <1%

## 🚀 Advanced Optimizations (Future)

### Service Worker Implementation
Consider implementing a service worker for:
- More aggressive WASM caching strategies
- Background updates of WASM files
- Offline-first experience

### Code Splitting Opportunities  
- Investigate DuckDB extensions loading on-demand
- Split visualization libraries by chart type
- Implement progressive feature loading

## 📝 Monitoring & Maintenance

### Key Metrics to Track
- **TTFB (Time to First Byte)** for WASM files
- **Cache hit ratio** across CDN layers
- **Compression ratio** effectiveness
- **User bounce rate** correlation with load times

### Regular Reviews
- **Monthly:** Review CDN analytics and cache performance
- **Quarterly:** Audit bundle sizes and compression effectiveness
- **On DuckDB updates:** Verify version-based caching works correctly

---

**Configuration Priority:** Implement CloudFront settings first (highest impact), then Cloudflare optimizations for the complete multi-CDN solution described in your performance analysis.