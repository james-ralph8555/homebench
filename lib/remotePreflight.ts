/**
 * @fileoverview Remote data source preflight checks and CORS error mapping
 *
 * This module provides preflight validation for loading remote data sources
 * and maps CORS/network errors to actionable user guidance.
 *
 * Key features:
 * - CORS preflight detection via HEAD/OPTIONS requests
 * - Actionable error messages for common CORS issues
 * - URL validation and protocol checking
 * - Preserves client-only architecture (no backend proxy)
 */

import { logger } from './logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Result of a remote source preflight check
 */
export interface RemotePreflightResult {
  /** Whether the remote source can be loaded */
  canLoad: boolean;
  /** Overall status category */
  status: RemoteSourceStatus;
  /** Human-readable message explaining the result */
  message: string;
  /** Actionable guidance for the user */
  guidance?: string;
  /** Technical details for debugging */
  details?: string;
  /** The URL that was checked */
  url: string;
  /** Detected file type from URL or headers */
  detectedFileType?: string;
  /** Content-Length if available */
  contentLength?: number;
}

/**
 * Status categories for remote source checks
 */
export type RemoteSourceStatus =
  | 'ok'
  | 'cors_blocked'
  | 'network_error'
  | 'invalid_url'
  | 'unsupported_protocol'
  | 'file_too_large'
  | 'http_error'
  | 'timeout'
  | 'unknown_error';

/**
 * Error classification for remote source operations
 */
export type RemoteErrorType =
  | 'cors_missing_allow_origin'
  | 'cors_missing_allow_methods'
  | 'cors_preflight_failure'
  | 'network_unreachable'
  | 'dns_failure'
  | 'connection_refused'
  | 'ssl_error'
  | 'http_403_forbidden'
  | 'http_404_not_found'
  | 'http_4xx_client_error'
  | 'http_5xx_server_error'
  | 'timeout'
  | 'file_too_large'
  | 'invalid_url_format'
  | 'unsupported_protocol'
  | 'unknown';

/**
 * Configuration for preflight checks
 */
export interface PreflightConfig {
  /** Maximum file size in bytes (default: 500MB for remote sources) */
  maxFileSize?: number;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Supported file extensions */
  supportedExtensions?: readonly string[];
}

const DEFAULT_CONFIG: Required<PreflightConfig> = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  timeout: 10000,
  supportedExtensions: ['csv', 'parquet', 'json', 'jsonl', 'ndjson'],
};

// =============================================================================
// CORS ERROR MAPPING
// =============================================================================

/**
 * Map a fetch error to a specific error type
 */
export function classifyRemoteError(error: unknown): RemoteErrorType {
  if (!(error instanceof Error)) {
    return 'unknown';
  }

  const message = error.message.toLowerCase();
  const name = error.name?.toLowerCase() ?? '';

  // CORS errors
  if (
    message.includes('cors') ||
    message.includes('cross-origin') ||
    message.includes('failed to fetch') ||
    name === 'typeerror'
  ) {
    // More specific CORS detection
    if (message.includes('access-control-allow-origin')) {
      return 'cors_missing_allow_origin';
    }
    if (message.includes('access-control-allow-methods')) {
      return 'cors_missing_allow_methods';
    }
    if (message.includes('preflight')) {
      return 'cors_preflight_failure';
    }
    // Generic CORS/fetch failure - likely CORS if it's a network-type error
    if (message.includes('failed to fetch') || name === 'typeerror') {
      return 'cors_missing_allow_origin';
    }
  }

  // Network errors
  if (message.includes('network') || message.includes('networkerror')) {
    return 'network_unreachable';
  }
  if (message.includes('dns') || message.includes('enotfound') || message.includes('getaddrinfo')) {
    return 'dns_failure';
  }
  if (message.includes('connection refused') || message.includes('econnrefused')) {
    return 'connection_refused';
  }
  if (message.includes('ssl') || message.includes('certificate') || message.includes('tls')) {
    return 'ssl_error';
  }
  if (message.includes('timeout') || name === 'aborterror' || message.includes('aborted')) {
    return 'timeout';
  }

  return 'unknown';
}

/**
 * Get actionable guidance for a remote error type
 */
export function getRemoteErrorGuidance(errorType: RemoteErrorType, url?: string): { message: string; guidance: string } {
  const domain = url ? new URL(url).hostname : 'the server';

  switch (errorType) {
    case 'cors_missing_allow_origin':
    case 'cors_missing_allow_methods':
    case 'cors_preflight_failure':
      return {
        message: `CORS policy blocked access to ${domain}`,
        guidance: `The server at ${domain} does not allow cross-origin requests from your browser.

**To fix this, the server owner needs to add these headers:**
• \`Access-Control-Allow-Origin: *\` (or your domain)
• \`Access-Control-Allow-Methods: GET, HEAD, OPTIONS\`

**Workarounds you can try:**
1. Download the file and upload it directly
2. Use a CORS proxy (not recommended for sensitive data)
3. Contact the data provider to enable CORS`,
      };

    case 'network_unreachable':
    case 'dns_failure':
      return {
        message: `Cannot reach ${domain}`,
        guidance: `The server at ${domain} could not be reached.

**Check the following:**
1. Verify the URL is correct
2. Check your internet connection
3. The server may be temporarily unavailable
4. Try opening the URL directly in a new browser tab`,
      };

    case 'connection_refused':
      return {
        message: `Connection refused by ${domain}`,
        guidance: `The server at ${domain} refused the connection.

This usually means:
• The server is not running or not accepting connections
• A firewall is blocking the request
• The port number may be incorrect`,
      };

    case 'ssl_error':
      return {
        message: `SSL/TLS certificate error for ${domain}`,
        guidance: `The SSL certificate for ${domain} has a problem.

**Possible causes:**
• Expired certificate
• Self-signed certificate not trusted by browser
• Certificate hostname mismatch

Try opening the URL in a new tab to see the browser's security warning.`,
      };

    case 'http_403_forbidden':
      return {
        message: `Access denied (403 Forbidden) from ${domain}`,
        guidance: `The server at ${domain} denied access to this resource.

**Possible solutions:**
• The file may require authentication
• The server may be blocking automated requests
• Try accessing the URL directly in your browser
• Download the file and upload it directly`,
      };

    case 'http_404_not_found':
      return {
        message: `File not found (404) at ${domain}`,
        guidance: `The file does not exist at the specified URL.

**Check the following:**
• Verify the URL is correct
• The file may have been moved or deleted
• Check for typos in the path`,
      };

    case 'http_4xx_client_error':
      return {
        message: `Client error from ${domain}`,
        guidance: `The server rejected the request.

Try opening the URL directly in your browser to see the actual error message.`,
      };

    case 'http_5xx_server_error':
      return {
        message: `Server error from ${domain}`,
        guidance: `The server at ${domain} encountered an internal error.

Try again later or download the file directly if available.`,
      };

    case 'timeout':
      return {
        message: `Request timed out`,
        guidance: `The server took too long to respond.

**Possible solutions:**
• The file may be too large for remote loading
• The server may be experiencing heavy load
• Try downloading the file and uploading it directly`,
      };

    case 'file_too_large':
      return {
        message: `File is too large for remote loading`,
        guidance: `The file exceeds the size limit for remote loading.

**Recommended solution:**
Download the file to your computer first, then upload it directly through the file upload area.`,
      };

    case 'invalid_url_format':
      return {
        message: `Invalid URL format`,
        guidance: `Please enter a valid URL.

**Format:** \`https://example.com/data.csv\`
• Must start with http:// or https://
• No spaces or special characters
• Include the full path to the file`,
      };

    case 'unsupported_protocol':
      return {
        message: `Unsupported URL protocol`,
        guidance: `Only HTTP and HTTPS URLs are supported.

Use a URL that starts with \`https://\` or \`http://\``,
      };

    default:
      return {
        message: `Unknown error loading remote source`,
        guidance: `An unexpected error occurred.

**Try these steps:**
1. Open the URL in a new browser tab to verify it works
2. Download the file and upload it directly
3. Check the browser console for more details`,
      };
  }
}

// =============================================================================
// URL VALIDATION
// =============================================================================

/**
 * Validate a URL string
 */
export function validateUrl(urlString: string): { valid: boolean; error?: string; parsed?: URL } {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = urlString.trim();
  if (!trimmed) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        error: `Unsupported protocol: ${parsed.protocol}. Only http:// and https:// are supported.`,
      };
    }

    return { valid: true, parsed };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid URL format: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

/**
 * Detect file type from URL path
 */
export function detectFileTypeFromUrl(url: URL): string | null {
  const pathname = url.pathname.toLowerCase();
  const extensions = ['csv', 'parquet', 'json', 'jsonl', 'ndjson', 'gz'];

  for (const ext of extensions) {
    if (pathname.endsWith(`.${ext}`) || pathname.endsWith(`.${ext}.gz`)) {
      return ext === 'gz' ? pathname.split('.').slice(-2)[0] : ext;
    }
  }

  return null;
}

// =============================================================================
// PREFLIGHT CHECK
// =============================================================================

/**
 * Perform a preflight check on a remote URL
 *
 * This checks:
 * 1. URL validity
 * 2. CORS availability via HEAD request
 * 3. Content-Length for size limits
 * 4. Content-Type for file type detection
 */
export async function checkRemoteSource(
  urlString: string,
  config: PreflightConfig = {}
): Promise<RemotePreflightResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const trimmedUrl = urlString.trim();

  // Step 1: Validate URL format
  const urlValidation = validateUrl(trimmedUrl);
  if (!urlValidation.valid) {
    return {
      canLoad: false,
      status: 'invalid_url',
      message: urlValidation.error ?? 'Invalid URL',
      guidance: urlValidation.error,
      url: trimmedUrl,
    };
  }

  const url = urlValidation.parsed!;
  const detectedType = detectFileTypeFromUrl(url);

  // Step 2: Attempt HEAD request for preflight check
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

  try {
    logger.info(`Preflight check for remote source: ${url.href}`);

    const response = await fetch(url.href, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check HTTP status
    if (!response.ok) {
      const errorType =
        response.status === 403
          ? 'http_403_forbidden'
          : response.status === 404
            ? 'http_404_not_found'
            : response.status >= 400 && response.status < 500
              ? 'http_4xx_client_error'
              : response.status >= 500
                ? 'http_5xx_server_error'
                : 'unknown';

      const { message, guidance } = getRemoteErrorGuidance(errorType, url.href);
      return {
        canLoad: false,
        status: 'http_error',
        message,
        guidance,
        details: `HTTP ${response.status}: ${response.statusText}`,
        url: url.href,
        detectedFileType: detectedType ?? undefined,
      };
    }

    // Check content length
    const contentLength = response.headers.get('Content-Length');
    const size = contentLength ? parseInt(contentLength, 10) : undefined;

    if (size && size > cfg.maxFileSize) {
      const { message, guidance } = getRemoteErrorGuidance('file_too_large', url.href);
      return {
        canLoad: false,
        status: 'file_too_large',
        message,
        guidance,
        details: `File size: ${(size / 1024 / 1024).toFixed(2)} MB. Maximum: ${(cfg.maxFileSize / 1024 / 1024).toFixed(0)} MB`,
        url: url.href,
        contentLength: size,
        detectedFileType: detectedType ?? undefined,
      };
    }

    // Check if file type is supported
    const contentType = response.headers.get('Content-Type');
    let fileType = detectedType;

    // Try to detect type from Content-Type header
    if (!fileType && contentType) {
      if (contentType.includes('csv') || contentType.includes('text/csv')) {
        fileType = 'csv';
      } else if (contentType.includes('parquet') || contentType.includes('application/parquet')) {
        fileType = 'parquet';
      } else if (contentType.includes('json')) {
        fileType = 'json';
      }
    }

    if (fileType && !cfg.supportedExtensions.includes(fileType)) {
      return {
        canLoad: false,
        status: 'unknown_error',
        message: `Unsupported file type: ${fileType}`,
        guidance: `Supported file types: ${cfg.supportedExtensions.join(', ')}`,
        url: url.href,
        detectedFileType: fileType,
      };
    }

    // Success!
    logger.info(`Preflight check passed for: ${url.href}`);
    return {
      canLoad: true,
      status: 'ok',
      message: 'Remote source is accessible',
      url: url.href,
      detectedFileType: fileType ?? undefined,
      contentLength: size,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    const errorType = classifyRemoteError(error);
    const { message, guidance } = getRemoteErrorGuidance(errorType, url.href);

    logger.warn(`Preflight check failed for ${url.href}:`, errorType, error);

    const status: RemoteSourceStatus =
      errorType === 'timeout'
        ? 'timeout'
        : errorType.startsWith('cors')
          ? 'cors_blocked'
          : errorType === 'network_unreachable' ||
              errorType === 'dns_failure' ||
              errorType === 'connection_refused'
            ? 'network_error'
            : 'unknown_error';

    return {
      canLoad: false,
      status,
      message,
      guidance,
      details: error instanceof Error ? error.message : String(error),
      url: url.href,
      detectedFileType: detectedType ?? undefined,
    };
  }
}

/**
 * Generate a safe table name from a URL
 */
export function generateTableNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Get filename from path
    const parts = parsed.pathname.split('/');
    const filename = parts[parts.length - 1] || 'remote_data';

    // Remove extension and sanitize
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

    // Add a short hash to make it unique
    const hash = url.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
    const shortHash = Math.abs(hash).toString(16).slice(0, 6);

    return `${baseName}_${shortHash}`;
  } catch {
    return `remote_data_${Date.now()}`;
  }
}

/**
 * Check if a URL looks like a remote data file
 */
export function isRemoteDataUrl(url: string): boolean {
  const validation = validateUrl(url);
  if (!validation.valid || !validation.parsed) {
    return false;
  }

  const fileType = detectFileTypeFromUrl(validation.parsed);
  return fileType !== null;
}
