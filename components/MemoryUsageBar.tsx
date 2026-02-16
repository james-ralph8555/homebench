'use client';

import React, { useState, useEffect } from 'react';
import {
  memoryBudgetManager,
  getMemoryStatus,
  WASM_32BIT_LIMIT,
  type MemoryStatus,
  type MemoryZone,
} from '@/lib/memoryBudgetManager';
import { WarningIcon } from './icons';

/**
 * Memory Usage Bar Component
 *
 * Displays memory usage relative to the 4GB WASM limit.
 * Uses JS heap as the metric since DuckDB memory isn't directly measurable from JS.
 */
export const MemoryUsageBar: React.FC = () => {
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      const status = getMemoryStatus();
      setMemoryStatus(status);
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 2000);

    return () => clearInterval(interval);
  }, []);

  // Memory API not available
  if (!memoryStatus) {
    return (
      <div className="text-xs text-gray-500">
        Loading memory info...
      </div>
    );
  }

  if (!memoryStatus.memoryApiAvailable) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <span className="inline-flex items-center">
          <WarningIcon className="text-orange-500 mr-1" size={14} />
          Memory monitoring unavailable
        </span>
      </div>
    );
  }

  const { zone, jsHeapUsed, wasmUsagePercent, recommendations } = memoryStatus;

  const getZoneColors = (): { bg: string; text: string } => {
    switch (zone) {
      case 'critical':
        return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400' };
      case 'warning':
        return { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' };
      case 'caution':
        return { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' };
      default:
        return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400' };
    }
  };

  const getZoneIcon = (): string | null => {
    switch (zone) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'caution':
        return '⚡';
      default:
        return null;
    }
  };

  const colors = getZoneColors();
  const icon = getZoneIcon();

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-sm">
        <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          <span className="hidden sm:inline">Memory: </span>
          <span className="sm:hidden">Mem: </span>
          {memoryBudgetManager.formatSize(jsHeapUsed || 0)} / {memoryBudgetManager.formatSize(WASM_32BIT_LIMIT)}
        </span>
        <div className="w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${colors.bg}`}
            style={{ width: `${Math.min(wasmUsagePercent, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${colors.text}`}>
          {Math.round(wasmUsagePercent)}%
        </span>
      </div>

      {zone !== 'safe' && (
        <div className={`text-xs ${colors.text} flex flex-col space-y-1`}>
          <div className="flex items-center">
            {icon && <span className="mr-1">{icon}</span>}
            <span>{memoryStatus.description}</span>
          </div>
          {zone === 'critical' && (
            <span className="text-xs text-gray-500 ml-5">
              Large operations are blocked until memory is freed
            </span>
          )}
          {recommendations.length > 0 && (
            <div className="ml-5 text-xs text-gray-500 space-y-0.5">
              {recommendations.slice(0, 2).map((rec, i) => (
                <div key={i}>• {rec}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
