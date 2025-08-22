import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryOptimizer,
  MemoryManager,
  debounce,
  throttle,
  PerformanceMonitor,
  ResultOptimizer,
} from '../performanceUtils';

describe('performanceUtils: QueryOptimizer', () => {
  it('adds LIMIT for plain SELECT without LIMIT', () => {
    const out = QueryOptimizer.optimizeQuery('select * from t');
    expect(out.toUpperCase()).toContain('LIMIT 1000');
  });

  it('does not modify when LIMIT present', () => {
    const out = QueryOptimizer.optimizeQuery('SELECT * FROM t LIMIT 5');
    expect(out).toBe('SELECT * FROM t LIMIT 5');
  });

  it('does not modify DDL/DML statements', () => {
    expect(QueryOptimizer.optimizeQuery('CREATE TABLE x(a int)')).toBe('CREATE TABLE x(a int)');
    expect(QueryOptimizer.optimizeQuery('UPDATE t SET a=1')).toBe('UPDATE t SET a=1');
  });
});

describe('performanceUtils: analyzeQuery', () => {
  it('low complexity for simple select', () => {
    const res = QueryOptimizer.analyzeQuery('select * from t');
    expect(res.complexity).toBe('low');
    expect(res.hints.length).toBe(0);
  });

  it('ORDER BY without LIMIT adds hint and medium complexity', () => {
    const res = QueryOptimizer.analyzeQuery('select * from t order by a');
    expect(res.complexity).toBe('medium');
    expect(res.hints.some(h => h.includes('ORDER BY without LIMIT'))).toBe(true);
  });

  it('multiple JOINs result in high complexity and hint', () => {
    const res = QueryOptimizer.analyzeQuery('select * from a join b on 1=1 join c on 1=1 join d on 1=1');
    expect(res.complexity).toBe('high');
    expect(res.hints.some(h => h.includes('Multiple JOINs detected'))).toBe(true);
  });

  it('detects potential Cartesian product', () => {
    const res = QueryOptimizer.analyzeQuery('select * from a cross join b');
    expect(res.complexity).toBe('high');
    expect(res.hints.some(h => h.toLowerCase().includes('cartesian product'))).toBe(true);
  });
});

describe('performanceUtils: MemoryManager', () => {
  it('estimates table memory usage', () => {
    expect(MemoryManager.estimateTableMemory(10, 2, 50)).toBe(1000);
  });

  it('formats memory sizes', () => {
    expect(MemoryManager.formatMemorySize(0)).toBe('0 B');
    expect(MemoryManager.formatMemorySize(1024)).toBe('1 KB');
    expect(MemoryManager.formatMemorySize(1536)).toBe('1.5 KB');
  });

  it('warns when estimated memory is large', () => {
    expect(MemoryManager.shouldWarnAboutMemory(100000, 21)).toBe(true);
    expect(MemoryManager.shouldWarnAboutMemory(1000, 10)).toBe(false);
  });
});



describe('performanceUtils: debounce/throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounce delays invocation and collapses calls', () => {
    const fn = vi.fn();
    const deb = debounce(fn, 100);
    deb('a');
    deb('b');
    vi.advanceTimersByTime(50);
    deb('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('throttle limits call rate', () => {
    const fn = vi.fn();
    const thr = throttle(fn, 100);
    thr('a');
    thr('b');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    thr('c');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('performanceUtils: PerformanceMonitor', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('measures async operation duration', async () => {
    const p = PerformanceMonitor.measureQuery(async () => {
      await new Promise(r => setTimeout(r, 50));
      return 'OK';
    }, 'SELECT 1');

    vi.advanceTimersByTime(50);
    const result = await p;
    expect(result.result).toBe('OK');
    expect(result.duration).toBeGreaterThanOrEqual(50);
  });

  it('logs metrics in development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const g = vi.spyOn(console, 'group').mockImplementation(() => {});
    const ge = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    PerformanceMonitor.logMetrics({ queryCount: 2, avgDuration: 10, totalMemory: 1024 });
    expect(g).toHaveBeenCalled();
    expect(ge).toHaveBeenCalled();
    g.mockRestore();
    ge.mockRestore();
    process.env.NODE_ENV = orig;
  });
});

describe('performanceUtils: ResultOptimizer', () => {
  it('selects optimal page size', () => {
    expect(ResultOptimizer.getOptimalPageSize(500, 10)).toBe(100);
    expect(ResultOptimizer.getOptimalPageSize(20000, 10)).toBe(100);
    expect(ResultOptimizer.getOptimalPageSize(200000, 10)).toBe(50);
    expect(ResultOptimizer.getOptimalPageSize(100, 25)).toBe(25);
  });

  it('enables virtualization when data is large', () => {
    expect(ResultOptimizer.shouldVirtualize(2000, 10)).toBe(true);
    expect(ResultOptimizer.shouldVirtualize(10, 100)).toBe(true);
    expect(ResultOptimizer.shouldVirtualize(10, 10)).toBe(false);
  });
});
