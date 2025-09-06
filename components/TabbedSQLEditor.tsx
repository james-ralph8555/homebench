'use client';

import React, { useState, useCallback, useRef } from 'react';
import { SQLEditor } from './SQLEditor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { XIcon, PlusIcon, GripVerticalIcon } from './icons';

interface SQLTab {
  id: string;
  label: string;
  content: string;
}

interface TabbedSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TabbedSQLEditor: React.FC<TabbedSQLEditorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [tabs, setTabs] = useState<SQLTab[]>([
    { id: '1', label: 'Query 1', content: value }
  ]);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [nextTabId, setNextTabId] = useState(2);
  const [height, setHeight] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  // Update the active tab's content when value prop changes
  React.useEffect(() => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTab ? { ...tab, content: value } : tab
      )
    );
  }, [value, activeTab]);

  const handleTabChange = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTab(tabId);
      onChange(tab.content);
    }
  }, [tabs, onChange]);

  const handleTabContentChange = useCallback((newContent: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTab ? { ...tab, content: newContent } : tab
      )
    );
    onChange(newContent);
  }, [activeTab, onChange]);

  const addNewTab = useCallback(() => {
    const newTab: SQLTab = {
      id: nextTabId.toString(),
      label: `Query ${nextTabId}`,
      content: ''
    };
    setTabs(prev => [...prev, newTab]);
    setNextTabId(prev => prev + 1);
    setActiveTab(newTab.id);
    onChange('');
  }, [nextTabId, onChange]);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return; // Don't close the last tab
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    // If closing the active tab, switch to another tab
    if (activeTab === tabId) {
      const nextActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      const nextActiveTab = newTabs[nextActiveIndex];
      setActiveTab(nextActiveTab.id);
      onChange(nextActiveTab.content);
    }
  }, [tabs, activeTab, onChange]);


  // Resize functionality
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaY = e.clientY - startYRef.current;
    const newHeight = Math.max(100, Math.min(800, startHeightRef.current + deltaY));
    setHeight(newHeight);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [height, handleMouseMove, handleMouseUp]);

  // Cleanup event listeners
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className={`${className}`}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center flex-1 min-w-0 mr-2">
            <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <TabsList className="flex-nowrap min-w-max">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="px-3 py-1.5 whitespace-nowrap"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(activeTab, e);
                }}
                className="ml-2 p-1 hover:bg-destructive/20 rounded transition-colors flex-shrink-0"
                title="Close current tab"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
          <Button
            onClick={addNewTab}
            variant="ghost"
            size="sm"
            className="px-2 py-1 h-8 flex-shrink-0"
            title="Add new tab"
          >
            <PlusIcon size={16} />
          </Button>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            <div className="relative overflow-hidden rounded-none">
              <SQLEditor
                value={currentTab?.content || ''}
                onChange={handleTabContentChange}
                style={{ height: `${height}px` }}
              />
              {/* Resize handle */}
              <div
                ref={resizeRef}
                className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors ${
                  isResizing ? 'bg-gray-300/70 dark:bg-gray-600/70' : ''
                }`}
                onMouseDown={handleMouseDown}
                title="Drag to resize editor"
              >
                <GripVerticalIcon size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
