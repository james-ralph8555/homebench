'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  SavedQuery, 
  getAllQueries, 
  saveQuery, 
  deleteQuery, 
  updateQuery 
} from '@/lib/queryStore';

interface SavedQueriesProps {
  onQuerySelect?: (query: string) => void;
  currentQuery?: string;
  onSaveCallbackChange?: (callback: () => void) => void;
}

export const SavedQueries: React.FC<SavedQueriesProps> = ({ onQuerySelect, currentQuery, onSaveCallbackChange }) => {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '', sql: '' });

  useEffect(() => {
    loadQueries();
  }, []);

  const saveCallback = useCallback(() => {
    openSaveDialog(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    // Provide the save callback to the parent
    if (onSaveCallbackChange) {
      onSaveCallbackChange(saveCallback);
    }
  }, [onSaveCallbackChange, saveCallback]);

  const loadQueries = async () => {
    try {
      const savedQueries = await getAllQueries();
      setQueries(savedQueries);
    } catch (error) {
      console.error('Failed to load saved queries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuery = async () => {
    if (!saveForm.name.trim() || !saveForm.sql.trim()) return;

    try {
      await saveQuery({
        name: saveForm.name.trim(),
        description: saveForm.description.trim() || undefined,
        sql: saveForm.sql.trim(),
      });
      
      setSaveForm({ name: '', description: '', sql: '' });
      setShowSaveDialog(false);
      await loadQueries();
    } catch (error) {
      console.error('Failed to save query:', error);
      alert('Failed to save query');
    }
  };

  const handleDeleteQuery = async (id: number) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      await deleteQuery(id);
      await loadQueries();
    } catch (error) {
      console.error('Failed to delete query:', error);
      alert('Failed to delete query');
    }
  };

  const handleSelectQuery = (query: SavedQuery) => {
    onQuerySelect?.(query.sql);
  };

  const openSaveDialog = (currentSql?: string) => {
    setSaveForm({ 
      name: '', 
      description: '', 
      sql: currentSql || '' 
    });
    setShowSaveDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {queries.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-2xl mb-2 text-gray-400">📝</div>
          <p>No saved queries yet</p>
          <p className="text-sm">Save your first query to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {queries.map((query) => (
            <div
              key={query.id}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleSelectQuery(query)}
                >
                  <h4 className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400">
                    {query.name}
                  </h4>
                  {query.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {query.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {query.updatedAt.toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteQuery(query.id!)}
                  className="text-red-500 hover:text-red-700 text-sm p-1"
                  title="Delete query"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Query</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  placeholder="My awesome query"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={saveForm.description}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  rows={2}
                  placeholder="What does this query do?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">SQL *</label>
                <textarea
                  value={saveForm.sql}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, sql: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-mono text-sm"
                  rows={4}
                  placeholder="SELECT * FROM table_name"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuery}
                disabled={!saveForm.name.trim() || !saveForm.sql.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};