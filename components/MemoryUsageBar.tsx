'use client';

import React, { useState, useEffect } from 'react';
import { MemoryManager } from '@/lib/performanceUtils';

export const MemoryUsageBar: React.FC = () => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      if (memory) {
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  if (!memoryInfo) {
    return null;
  }

  const usagePercentage = Math.min((memoryInfo.used / memoryInfo.limit) * 100, 100);
  const isHigh = usagePercentage > 80;
  const isMedium = usagePercentage > 60;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
        <span className="hidden sm:inline">Memory: </span>
        <span className="sm:hidden">RAM: </span>
        {MemoryManager.formatMemorySize(memoryInfo.used)} / {MemoryManager.formatMemorySize(memoryInfo.limit)}
      </span>
      <div className="w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isHigh ? 'bg-red-500' : isMedium ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${usagePercentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${
        isHigh ? 'text-red-600 dark:text-red-400' : 
        isMedium ? 'text-yellow-600 dark:text-yellow-400' : 
        'text-green-600 dark:text-green-400'
      }`}>
        {usagePercentage.toFixed(1)}%
      </span>
    </div>
  );
};