// Lightweight logger with environment-aware levels
// - debug: no-ops in production builds
// - info/warn/error: always log

type LogFn = (...args: any[]) => void;

const isProd = process.env.NODE_ENV === 'production';

// Small helper to strip obvious emoji characters from first string arg
function sanitizeArgs(args: any[]): any[] {
  if (args.length === 0) return args;
  const [first, ...rest] = args;
  if (typeof first === 'string') {
    // Remove common emoji and emoji-style symbols to keep logs clean
    const cleaned = first
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // emoji range
      .replace(/[\u2700-\u27BF]/g, '') // dingbats
      .replace(/[\u2600-\u26FF]/g, ''); // misc symbols
    return [cleaned.trim(), ...rest];
  }
  return args;
}

const debug: LogFn = (...args) => {
  if (!isProd) {
    // Use console.debug in dev, sanitized
    // eslint-disable-next-line no-console
    console.debug(...sanitizeArgs(args));
  }
};

const info: LogFn = (...args) => {
  // eslint-disable-next-line no-console
  console.info(...sanitizeArgs(args));
};

const warn: LogFn = (...args) => {
  // eslint-disable-next-line no-console
  console.warn(...sanitizeArgs(args));
};

const error: LogFn = (...args) => {
  // eslint-disable-next-line no-console
  console.error(...sanitizeArgs(args));
};

export const logger = { debug, info, warn, error };

