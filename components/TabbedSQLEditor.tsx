'use client';

import React, { useState, useCallback, useRef } from 'react';
import { SQLEditor } from './SQLEditor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { XIcon, PlusIcon, GripVerticalIcon } from './icons';
import { getPreference, setPreference } from '@/lib/queryStore';
import { debounce } from '@/lib/performanceUtils';

interface SQLTab {
  id: string;
  label: string;
  content: string;
}

interface TabbedSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  useMobilePlaceholder?: boolean;
}

export const TabbedSQLEditor: React.FC<TabbedSQLEditorProps> = ({
  value,
  onChange,
  className = '',
  useMobilePlaceholder
}) => {
  // Persisted editor state key
  const PREF_KEY = 'editorState';

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
  const isHydratedRef = useRef<boolean>(false);
  const userEditedRef = useRef<boolean>(false);

  type EditorState = {
    tabs: SQLTab[];
    activeTabId: string;
    nextTabId: number;
    // height?: number; // Not required for spec, can add later
  };

  // Restore editor state from IndexedDB (Dexie preferences)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await getPreference<EditorState | null>(PREF_KEY, null);
        if (cancelled || !saved) {
          isHydratedRef.current = true;
          return;
        }
        setTabs(saved.tabs && saved.tabs.length > 0 ? saved.tabs : [{ id: '1', label: 'Query 1', content: value }]);
        setActiveTab(saved.activeTabId || (saved.tabs?.[0]?.id ?? '1'));
        setNextTabId(saved.nextTabId || 2);
        // Sync parent with the active tab's content
        const active = saved.tabs.find(t => t.id === (saved.activeTabId || '1')) || saved.tabs[0];
        if (active) {
          onChange(active.content || '');
        }
      } catch (e) {
        // If anything goes wrong, proceed with defaults
        console.warn('Failed to restore editor state:', e);
      } finally {
        isHydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced saver to limit IndexedDB writes while typing
  const persistState = React.useMemo(() => debounce(async (state: EditorState) => {
    try {
      await setPreference(PREF_KEY, state);
    } catch (e) {
      console.warn('Failed to persist editor state:', e);
    }
  }, 1000), []);

  // Update the active tab's content when value prop changes
  React.useEffect(() => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTab ? { ...tab, content: value } : tab
      )
    );
  }, [value, activeTab]);

  // Note: We persist explicitly after user edits to avoid frequent status flashing.

  const handleTabChange = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTab(tabId);
      onChange(tab.content);
      // Persist active tab switch (lightweight)
      const nextState: EditorState = { tabs, activeTabId: tabId, nextTabId };
      if (isHydratedRef.current) persistState(nextState);
    }
  }, [tabs, onChange, persistState, nextTabId]);

  const handleTabContentChange = useCallback((newContent: string) => {
    userEditedRef.current = true;
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTab ? { ...tab, content: newContent } : tab
      )
    );
    onChange(newContent);
    // Persist after user edit (debounced)
    const nextState: EditorState = {
      tabs: tabs.map(t => t.id === activeTab ? { ...t, content: newContent } : t),
      activeTabId: activeTab,
      nextTabId
    };
    if (isHydratedRef.current) persistState(nextState);
  }, [activeTab, onChange, persistState, tabs, nextTabId]);

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
    // Persist structural change
    const nextState: EditorState = { tabs: [...tabs, newTab], activeTabId: newTab.id, nextTabId: nextTabId + 1 };
    if (isHydratedRef.current) persistState(nextState);
  }, [nextTabId, onChange, persistState, tabs]);

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
    // Persist structural change
    const nextActiveId = activeTab === tabId
      ? (newTabs[Math.min(tabIndex, newTabs.length - 1)]?.id || newTabs[0]?.id || '1')
      : activeTab;
    const nextState: EditorState = { tabs: newTabs, activeTabId: nextActiveId, nextTabId };
    if (isHydratedRef.current) persistState(nextState);
  }, [tabs, activeTab, onChange, persistState, nextTabId]);


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
          <div className="flex items-center flex-1 min-w-0 mr-2 overflow-hidden bg-muted rounded-md p-1">
            <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <TabsList className="flex-nowrap w-full justify-start shrink-0 bg-muted">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="group relative px-3 pr-6 py-1.5 whitespace-nowrap flex-shrink-0"
                  >
                    {tab.label}
                    {tabs.length > 1 && (
                      <span
                        onClick={(e: React.MouseEvent) => closeTab(tab.id, e)}
                        onMouseDown={(e) => {
                          // Prevent focusing/switching tabs when pressing the close icon
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="absolute right-1 inline-flex items-center justify-center h-4 w-4 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-destructive/20"
                        title={`Close ${tab.label}`}
                        aria-label={`Close ${tab.label}`}
                        role="button"
                      >
                        <XIcon size={12} />
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
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
                value={tab.content}
                onChange={handleTabContentChange}
                style={{ height: `${height}px` }}
                useMobilePlaceholder={useMobilePlaceholder}
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
