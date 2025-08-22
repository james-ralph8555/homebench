'use client';

import React, { useState, useEffect } from 'react';
import { MemoryManager } from '@/lib/performanceUtils';

interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  wasmLimit: number;
}

export const MemoryUsageBar: React.FC = () => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      // WebAssembly 32-bit memory limit is 4GB (4 * 1024 * 1024 * 1024 bytes)
      const WASM_4GB_LIMIT = 4 * 1024 * 1024 * 1024;
      
      if (memory) {
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          wasmLimit: WASM_4GB_LIMIT
        });
      } else {
        // Fallback when performance.memory is not available
        // Show a basic memory indicator based on WebAssembly limit
        setMemoryInfo({
          used: 0,
          total: 0,
          limit: WASM_4GB_LIMIT,
          wasmLimit: WASM_4GB_LIMIT
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 2000); // Update every 2 seconds for better responsiveness

    return () => clearInterval(interval);
  }, []);

  if (!memoryInfo) {
    // Check if performance.memory is available to show appropriate message
    const memory = (performance as any).memory;
    if (!memory) {
      return (
        <div className="text-xs text-gray-500">
          Cannot Display Memory
        </div>
      );
    }
    return (
      <div className="text-xs text-gray-500">
        Loading memory info...
      </div>
    );
  }

  // Use the 4GB WebAssembly limit as the primary reference point
  const wasmUsagePercentage = Math.min((memoryInfo.used / memoryInfo.wasmLimit) * 100, 100);
  const jsHeapUsagePercentage = Math.min((memoryInfo.used / memoryInfo.limit) * 100, 100);
  
  // More aggressive warnings for WebAssembly memory limit
  const isCritical = wasmUsagePercentage > 90; // Critical at 90%
  const isHigh = wasmUsagePercentage > 75;     // High at 75%
  const isMedium = wasmUsagePercentage > 50;   // Medium at 50%

  const getStatusColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isHigh) return 'bg-orange-500';
    if (isMedium) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (isCritical) return 'text-red-600 dark:text-red-400';
    if (isHigh) return 'text-orange-600 dark:text-orange-400';
    if (isMedium) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getWarningMessage = () => {
    if (isCritical) return '⚠️ Near 4GB WebAssembly limit!';
    if (isHigh) return '⚠️ High memory usage';
    if (isMedium) return '⚡ Moderate memory usage';
    return null;
  };

  // Check if we're in fallback mode (no performance.memory API)
  const isInFallbackMode = memoryInfo.used === 0 && memoryInfo.total === 0;

  if (isInFallbackMode) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <span>Memory monitoring unavailable</span>
        <span className="text-orange-500" title="Performance.memory API not available in this browser">⚠️</span>
        <span className="text-xs">(4GB WASM limit)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-sm">
        <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          <span className="hidden sm:inline">Memory: </span>
          <span className="sm:hidden">RAM: </span>
          {MemoryManager.formatMemorySize(memoryInfo.used)} / {MemoryManager.formatMemorySize(memoryInfo.wasmLimit)}
          <span className="text-xs text-gray-500 ml-1">(4GB limit)</span>
        </span>
        <div className="w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${wasmUsagePercentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${getTextColor()}`}>
          {wasmUsagePercentage.toFixed(1)}%
        </span>
      </div>
      {getWarningMessage() && (
        <div className={`text-xs ${getTextColor()} flex items-center`}>
          {getWarningMessage()}
          {isCritical && (
            <span className="ml-2 text-xs text-gray-500">
              Consider reducing dataset size or refreshing the page
            </span>
          )}
        </div>
      )}
    </div>
  );
};