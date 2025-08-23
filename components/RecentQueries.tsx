'use client';

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { QueryHistory, getQueryHistory, searchQueryHistory, clearQueryHistory } from '@/lib/queryStore';
import { SearchIcon, ClockIcon, TrashIcon, CopyIcon } from './icons';

interface RecentQueriesProps {
  onQuerySelect: (sql: string) => void;
  className?: string;
}

export const RecentQueries: React.FC<RecentQueriesProps> = ({ onQuerySelect, className = '' }) => {
  const [queries, setQueries] = useState<QueryHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const loadQueries = async (search?: string) => {
    setLoading(true);
    try {
      const results = search 
        ? await searchQueryHistory(search, 100)
        : await getQueryHistory(100);
      setQueries(results);
    } catch (error) {
      console.error('Failed to load query history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadQueries(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all query history?')) {
      await clearQueryHistory();
      await loadQueries();
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const truncateQuery = (sql: string, maxLength = 100) => {
    if (sql.length <= maxLength) return sql;
    return sql.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search and controls */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search query history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {queries.length} queries
          </span>
          <Button
            onClick={handleClearHistory}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            <TrashIcon className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Query list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : queries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No matching queries found' : 'No query history yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {queries.map((query, index) => (
                <div
                  key={query.id || index}
                  className="group relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => onQuerySelect(query.sql)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all">
                        {truncateQuery(query.sql)}
                      </pre>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3 w-3" />
                        {formatRelativeTime(query.executedAt)}
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuerySelect(query.sql);
                      }}
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      title="Copy to editor"
                    >
                      <CopyIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};