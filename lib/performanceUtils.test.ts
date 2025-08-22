import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryOptimizer,
  MemoryManager,
  ConnectionUtils,
  debounce,
  throttle,
  PerformanceMonitor,
  ResultOptimizer,
} from './performanceUtils';

describe('QueryOptimizer.optimizeQuery', () => {
  it('adds LIMIT to simple SELECT without LIMIT', () => {
    const out = QueryOptimizer.optimizeQuery('SELECT * FROM t');
    expect(out).toMatch(/LIMIT 1000$/);
  });

  it('does not modify when LIMIT exists', () => {
    const out = QueryOptimizer.optimizeQuery('select * from t limit 5');
    expect(out.trim()).toBe('select * from t limit 5');
  });

  it('does not modify DDL/DML statements', () => {
    const statements = ['CREATE TABLE x(a int)', 'INSERT INTO x VALUES (1)', 'UPDATE x SET a=2', 'DELETE FROM x', 'DROP TABLE x', 'ALTER TABLE x ADD COLUMN b int'];
    for (const s of statements) {
      expect(QueryOptimizer.optimizeQuery(s)).toBe(s);
    }
  });
});

describe('QueryOptimizer.analyzeQuery', () => {
  it('detects high complexity for multiple JOINs', () => {
    const q = 'SELECT * FROM a JOIN b ON a.id=b.id JOIN c ON c.id=b.id JOIN d ON d.id=c.id';
    const res = QueryOptimizer.analyzeQuery(q);
    expect(res.complexity).toBe('high');
    expect(res.hints.some(h => h.includes('JOIN'))).toBe(true);
  });

  it('adds hint for ORDER BY without LIMIT', () => {
    const res = QueryOptimizer.analyzeQuery('SELECT * FROM t ORDER BY a');
    expect(res.hints.join(' ')).toMatch(/ORDER BY without LIMIT/);
  });
});

describe('MemoryManager', () => {
  it('estimates memory usage', () => {
    expect(MemoryManager.estimateTableMemory(100, 10)).toBe(100 * 10 * 50);
  });

  it('formats memory size', () => {
    expect(MemoryManager.formatMemorySize(0)).toBe('0 B');
    expect(MemoryManager.formatMemorySize(1024)).toBe('1 KB');
  });

  it('warns for large memory estimates', () => {
    expect(MemoryManager.shouldWarnAboutMemory(100000, 30)).toBe(true);
    expect(MemoryManager.shouldWarnAboutMemory(100, 3)).toBe(false);
  });
});

describe('ConnectionUtils', () => {
  const originalNavigator = navigator;
  beforeEach(() => {
    globalThis.navigator = { ...originalNavigator } as any;
  });
  afterEach(() => {
    globalThis.navigator = originalNavigator as any;
  });

  it('calculates pool size from device memory', () => {
    // @ts-expect-error define for test
    navigator.deviceMemory = 8;
    // @ts-expect-error define for test
    navigator.hardwareConcurrency = 8;
    expect(ConnectionUtils.getOptimalPoolSize()).toBe(4); // max 4
  });

  it('reports browser capabilities', () => {
    const caps = ConnectionUtils.getBrowserCapabilities();
    expect(typeof caps.webAssembly).toBe('boolean');
    expect(typeof caps.opfs).toBe('boolean');
  });
});

describe('debounce', () => {
  it('delays function calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d();
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('throttle', () => {
  it('limits calls within period', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t();
    t();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    t();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('PerformanceMonitor.measureQuery', () => {
  it('measures async operation duration', async () => {
    const { result, duration } = await PerformanceMonitor.measureQuery(async () => 42, 'SELECT 42');
    expect(result).toBe(42);
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('ResultOptimizer', () => {
  it('chooses smaller page sizes for wide tables', () => {
    expect(ResultOptimizer.getOptimalPageSize(100, 30)).toBe(25);
  });

  it('enables virtualization for large datasets', () => {
    expect(ResultOptimizer.shouldVirtualize(2000, 5)).toBe(true);
  });
});

