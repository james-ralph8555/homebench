// Performance utilities for HomeBench

// Query optimization helpers
export const QueryOptimizer = {
  // Add automatic LIMIT for large queries without explicit LIMIT
  optimizeQuery: (sql: string, maxRows: number = 1000): string => {
    const trimmedSql = sql.trim().toUpperCase();
    
    // Skip if already has LIMIT, OFFSET, or is a DDL statement
    if (
      trimmedSql.includes('LIMIT') ||
      trimmedSql.includes('OFFSET') ||
      trimmedSql.startsWith('CREATE') ||
      trimmedSql.startsWith('DROP') ||
      trimmedSql.startsWith('ALTER') ||
      trimmedSql.startsWith('INSERT') ||
      trimmedSql.startsWith('UPDATE') ||
      trimmedSql.startsWith('DELETE')
    ) {
      return sql;
    }
    
    // Add LIMIT for SELECT queries
    if (trimmedSql.startsWith('SELECT')) {
      return `${sql.trim()} LIMIT ${maxRows}`;
    }
    
    return sql;
  },

  // Analyze query complexity for performance hints
  analyzeQuery: (sql: string): { complexity: 'low' | 'medium' | 'high'; hints: string[] } => {
    const upperSql = sql.toUpperCase();
    const hints: string[] = [];
    let complexity: 'low' | 'medium' | 'high' = 'low';

    // Check for potentially expensive operations
    if (upperSql.includes('GROUP BY')) {
      complexity = 'medium';
      if (!upperSql.includes('LIMIT')) {
        hints.push('Consider adding LIMIT for large GROUP BY operations');
      }
    }

    if (upperSql.includes('ORDER BY') && !upperSql.includes('LIMIT')) {
      hints.push('ORDER BY without LIMIT can be expensive on large datasets');
      complexity = 'medium';
    }

    if (upperSql.includes('JOIN')) {
      complexity = 'medium';
      if (upperSql.match(/JOIN/g)?.length! > 2) {
        complexity = 'high';
        hints.push('Multiple JOINs detected - ensure proper indexing');
      }
    }

    if (upperSql.includes('LIKE') || upperSql.includes('ILIKE')) {
      hints.push('Use LIKE with leading wildcards sparingly for better performance');
    }

    if (upperSql.includes('COUNT(*)') && !upperSql.includes('LIMIT')) {
      hints.push('COUNT(*) on large tables can be slow - consider LIMIT or approximate counts');
      complexity = 'medium';
    }

    // Detect potentially very expensive operations
    if (
      upperSql.includes('CROSS JOIN') ||
      upperSql.includes('CARTESIAN') ||
      (upperSql.match(/FROM.*,/g)?.length! > 0 && !upperSql.includes('WHERE'))
    ) {
      complexity = 'high';
      hints.push('⚠️ Potential Cartesian product detected - verify JOIN conditions');
    }

    return { complexity, hints };
  }
};

// Memory management for large datasets
export const MemoryManager = {
  // Estimate memory usage for Arrow tables
  estimateTableMemory: (numRows: number, numColumns: number, avgColumnSize: number = 50): number => {
    // Rough estimation in bytes
    return numRows * numColumns * avgColumnSize;
  },

  // Format memory size for display
  formatMemorySize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Check if we should warn about memory usage
  shouldWarnAboutMemory: (numRows: number, numColumns: number): boolean => {
    const estimatedMemory = MemoryManager.estimateTableMemory(numRows, numColumns);
    return estimatedMemory > 100 * 1024 * 1024; // 100MB threshold
  }
};



// Debounce utilities for UI performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitFor: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

// Throttle utilities for limiting expensive operations
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Performance monitoring
export const PerformanceMonitor = {
  // Measure query execution time
  measureQuery: async <T>(
    operation: () => Promise<T>, 
    queryText: string
  ): Promise<{ result: T; duration: number; memory?: number }> => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      const endMemory = (performance as any).memory?.usedJSHeapSize;
      
      console.log(`Query executed in ${duration.toFixed(2)}ms:`, queryText.substring(0, 100));
      
      return {
        result,
        duration,
        memory: endMemory && startMemory ? endMemory - startMemory : undefined
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Query failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  // Log performance metrics
  logMetrics: (metrics: { queryCount: number; avgDuration: number; totalMemory: number }) => {
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 HomeBench Performance Metrics');
      console.log(`Queries executed: ${metrics.queryCount}`);
      console.log(`Average duration: ${metrics.avgDuration.toFixed(2)}ms`);
      console.log(`Memory usage: ${MemoryManager.formatMemorySize(metrics.totalMemory)}`);
      console.groupEnd();
    }
  }
};

// Query result optimization
export const ResultOptimizer = {
  // Determine optimal page size based on data characteristics
  getOptimalPageSize: (rowCount: number, columnCount: number): number => {
    // Smaller page sizes for wide tables or large datasets
    if (columnCount > 20) return 25;
    if (rowCount > 100000) return 50;
    if (rowCount > 10000) return 100;
    return 100; // Default page size
  },

  // Check if we should enable virtualization
  shouldVirtualize: (rowCount: number, columnCount: number): boolean => {
    return rowCount > 1000 || columnCount > 50;
  }
};
