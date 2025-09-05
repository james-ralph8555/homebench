'use client';

import React, { useState } from 'react';
import { useInstrumentPanel } from '@/hooks/useInstrumentPanel';
import { MemoryUsageBar } from './MemoryUsageBar';
import { Button } from './ui/Button';
import { Switch } from './ui/Switch';
import { Separator } from './ui/Separator';

interface InstrumentPanelProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  theme,
  onThemeToggle
}) => {
  const {
    databaseName,
    databaseSize,
    databaseLocation,
    opfsStatus,
    opfsStatusText,
    canWrite,
    isCurrentTabOwner,
    lockOwner,
    isSaving,
    lastCommitTime,
    requestLock
  } = useInstrumentPanel();

  const [showMemoryTooltip, setShowMemoryTooltip] = useState(false);

  // Format database size
  const formatSize = (bytes: number | null): string => {
    if (bytes === null) return 'Unknown';
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = Math.round((bytes / Math.pow(k, i)) * 100) / 100;
    return `${size} ${sizes[i]}`;
  };

  // Get status indicator color
  const getStatusColor = () => {
    switch (opfsStatus) {
      case 'mounted': return 'bg-green-500';
      case 'read-only': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'unavailable': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Format last commit time
  const formatLastCommit = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50 hidden lg:block">
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-between text-xs">
          {/* Left section: Database status */}
          <div className="flex items-center space-x-4">
            {/* OPFS Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-muted-foreground">OPFS:</span>
              <span className="font-medium">{opfsStatusText}</span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Database Info */}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">DB:</span>
              <span className="font-medium">{databaseName}</span>
              <span className="text-muted-foreground">({formatSize(databaseSize)})</span>
              <span className="text-muted-foreground">@</span>
              <span className="font-medium">{databaseLocation}</span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Write Lock Owner */}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Lock:</span>
              {lockOwner === 'this-tab' ? (
                <span className="font-medium text-green-600 dark:text-green-400">This tab</span>
              ) : lockOwner === 'other-tab' ? (
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">Other tab</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={requestLock}
                    className="h-5 px-2 text-xs"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Taking...' : 'Take Control'}
                  </Button>
                </div>
              ) : (
                <span className="font-medium text-gray-500">Unknown</span>
              )}
            </div>
          </div>

          {/* Middle section: Saving status */}
          <div className="flex items-center space-x-4">
            {/* Saving Indicator */}
            <div className="flex items-center space-x-2">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Saving...</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Saved</span>
                </>
              )}
            </div>

            {/* Last Commit Time */}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Last:</span>
              <span className="font-medium">{formatLastCommit(lastCommitTime)}</span>
            </div>
          </div>

          {/* Right section: Controls */}
          <div className="flex items-center space-x-4">
            {/* Memory Usage (with hover tooltip) */}
            <div 
              className="relative"
              onMouseEnter={() => setShowMemoryTooltip(true)}
              onMouseLeave={() => setShowMemoryTooltip(false)}
            >
              <div className="flex items-center space-x-2 cursor-help">
                <span className="text-muted-foreground">Memory</span>
                <div className="w-8 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              
              {/* Memory Tooltip */}
              {showMemoryTooltip && (
                <div className="absolute bottom-full right-0 mb-2 p-3 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-64">
                  <MemoryUsageBar />
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Theme:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-xs ${theme === 'light' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Light
                </span>
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => {
                    if (checked !== (theme === 'dark')) {
                      onThemeToggle();
                    }
                  }}
                  className="scale-75"
                />
                <span className={`text-xs ${theme === 'dark' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Dark
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};