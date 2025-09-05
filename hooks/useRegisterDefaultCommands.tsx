"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Upload, 
  Search, 
  BarChart3, 
  Play, 
  Code, 
  Database, 
  FileText, 
  Sun, 
  Moon,
  HelpCircle,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  Activity
} from "lucide-react";
import { useCommandPalette } from "@/components/command-palette/CommandPaletteProvider";
import { useDuckDB } from "@/contexts/DuckDBContext";
import { getTables } from "@/lib/duckdbManager";

interface UseRegisterDefaultCommandsProps {
  // Props from TabbedWorkbench context
  activeTab?: 'upload' | 'query' | 'visualization';
  onTabChange?: (tab: 'upload' | 'query' | 'visualization') => void;
  onExecuteQuery?: () => void;
  onToggleTheme?: () => void;
  onShowSettings?: () => void;
  theme?: 'light' | 'dark';
  currentSql?: string;
  setSql?: (sql: string) => void;
}

export function useRegisterDefaultCommands({
  activeTab,
  onTabChange,
  onExecuteQuery,
  onToggleTheme,
  onShowSettings,
  theme,
  currentSql,
  setSql
}: UseRegisterDefaultCommandsProps = {}) {
  const { register } = useCommandPalette();
  const router = useRouter();
  const { 
    isReady, 
    hasWriteAccess, 
    multiTabStatus,
    db,
    isLoading 
  } = useDuckDB();

  // Check if we can perform write operations
  const canWrite = isReady && hasWriteAccess && !isLoading;
  const isLeader = multiTabStatus?.role === 'leader';
  const isClient = multiTabStatus?.role === 'client';

  // Dynamic table listing
  const getTableActions = useCallback(async () => {
    if (!isReady || !db) return [];

    try {
      const tables = await getTables();
      return tables.map(tableName => ({
        id: `table-preview-${tableName}`,
        title: `Preview: ${tableName}`,
        subtitle: `Open table ${tableName} for preview`,
        section: "Database" as const,
        keywords: ["table", "preview", tableName, "#"],
        icon: <Eye size={16} />,
        onTrigger: () => {
          if (setSql) {
            setSql(`SELECT * FROM "${tableName}" LIMIT 100;`);
          }
          if (onTabChange) {
            onTabChange('query');
          }
        }
      }));
    } catch (error) {
      console.warn('Failed to get tables for command palette:', error);
      return [];
    }
  }, [isReady, db, setSql, onTabChange]);

  // Memoized handlers to prevent infinite re-renders
  const handleNavToUpload = useCallback(() => {
    if (onTabChange) onTabChange('upload');
    else router.push('/');
  }, [onTabChange, router]);

  const handleNavToQuery = useCallback(() => {
    if (onTabChange) onTabChange('query');
    else router.push('/');
  }, [onTabChange, router]);

  const handleNavToVisualization = useCallback(() => {
    if (onTabChange) onTabChange('visualization');
    else router.push('/');
  }, [onTabChange, router]);

  // Register core navigation commands
  useEffect(() => {
    const unregister = register([
      // Navigation commands (> prefix)
      {
        id: "nav-upload",
        title: "Go to: Data Upload",
        subtitle: "Upload CSV, Parquet, or JSON files",
        section: "Navigate",
        keywords: [">", "upload", "import", "data"],
        shortcut: ["1"],
        icon: <Upload size={16} />,
        scoreBoost: activeTab === 'upload' ? 2 : 0,
        onTrigger: handleNavToUpload
      },
      {
        id: "nav-query", 
        title: "Go to: Query Editor",
        subtitle: "Write and execute SQL queries",
        section: "Navigate",
        keywords: [">", "query", "sql", "editor"],
        shortcut: ["2"],
        icon: <Search size={16} />,
        scoreBoost: activeTab === 'query' ? 2 : 0,
        onTrigger: handleNavToQuery
      },
      {
        id: "nav-visualization",
        title: "Go to: Visualization", 
        subtitle: "Create charts and visualizations",
        section: "Navigate",
        keywords: [">", "viz", "chart", "graph", "plot"],
        shortcut: ["3"],
        icon: <BarChart3 size={16} />,
        scoreBoost: activeTab === 'visualization' ? 2 : 0,
        onTrigger: handleNavToVisualization
      }
    ]);

    return unregister;
  }, [register, activeTab, handleNavToUpload, handleNavToQuery, handleNavToVisualization]);

  // Register SQL editor commands
  useEffect(() => {
    const commands = [
      {
        id: "sql-run",
        title: "Run Query",
        subtitle: "Execute the current SQL query",
        section: "Editor" as const,
        keywords: [":", "run", "execute", "sql"],
        shortcut: ["⌘↵"],
        icon: <Play size={16} />,
        enabled: !!onExecuteQuery && canWrite,
        onTrigger: () => onExecuteQuery?.()
      },
      {
        id: "sql-format", 
        title: "Format SQL",
        subtitle: "Auto-format the current SQL query",
        section: "Editor" as const,
        keywords: [":", "format", "pretty", "sql"],
        shortcut: ["⇧⌘F"],
        icon: <Code size={16} />,
        enabled: !!currentSql?.trim(),
        onTrigger: () => {
          // Basic SQL formatting - could be enhanced with a proper SQL formatter
          if (setSql && currentSql) {
            const formatted = currentSql
              .replace(/\s+/g, ' ')
              .replace(/\s*,\s*/g, ',\n  ')
              .replace(/\s+(FROM|JOIN|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT)\s+/gi, '\n$1 ')
              .replace(/\s+(AND|OR)\s+/gi, '\n  $1 ')
              .trim();
            setSql(formatted);
          }
        }
      },
      {
        id: "sql-explain",
        title: "Explain Query Plan", 
        subtitle: "Show the execution plan for current query",
        section: "Editor" as const,
        keywords: [":", "explain", "plan", "analyze"],
        icon: <Activity size={16} />,
        enabled: !!currentSql?.trim() && canWrite,
        onTrigger: () => {
          if (setSql && currentSql) {
            setSql(`EXPLAIN ANALYZE ${currentSql}`);
          }
          onExecuteQuery?.();
        }
      }
    ];

    const unregister = register(commands);
    return unregister;
  }, [register, onExecuteQuery, canWrite, currentSql, setSql]);

  // Register database commands
  useEffect(() => {
    const commands = [
      {
        id: "db-status",
        title: isReady ? 
          (hasWriteAccess ? "Database: Ready" : "Database: Read-only") : 
          "Database: Loading",
        subtitle: isLeader ? 
          `Leader tab - ${multiTabStatus?.activeConnections || 0} connections` :
          isClient ? "Client tab - connected to leader" :
          "Single tab mode",
        section: "Database" as const,
        enabled: false, // Info only
        icon: <Database size={16} />,
        onTrigger: () => {}
      },
      {
        id: "db-recover-lock",
        title: "Take Control",
        subtitle: "Make this tab the database owner",
        section: "Database" as const,
        keywords: ["recover", "lock", "take", "control"],
        enabled: !hasWriteAccess && isClient,
        visible: !hasWriteAccess,
        icon: <RefreshCw size={16} />,
        onTrigger: async () => {
          // This would need to be implemented in the DuckDB context
          console.log('Taking control of database...');
          // Add actual implementation to force this tab to become leader
        }
      },
      {
        id: "db-clear",
        title: "Clear Database",
        subtitle: "Remove all tables and data",
        section: "Database" as const,
        keywords: ["clear", "reset", "drop"],
        enabled: canWrite,
        icon: <Trash2 size={16} />,
        onTrigger: async () => {
          if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
            try {
              const tables = await getTables();
              if (setSql) {
                const dropStatements = tables.map(table => `DROP TABLE IF EXISTS "${table}";`);
                setSql(dropStatements.join('\n'));
              }
            } catch (error) {
              console.error('Failed to generate clear database SQL:', error);
            }
          }
        }
      }
    ];

    const unregister = register(commands);
    return unregister;
  }, [register, isReady, hasWriteAccess, isLeader, isClient, multiTabStatus, canWrite, setSql]);

  // Register view commands
  useEffect(() => {
    const commands = [
      {
        id: "view-theme-toggle",
        title: "Toggle Theme",
        subtitle: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,
        section: "View" as const,
        keywords: ["theme", "dark", "light", "toggle"],
        shortcut: ["⌘D"],
        icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
        onTrigger: () => onToggleTheme?.()
      },
      {
        id: "view-settings",
        title: "Open Settings",
        subtitle: "Configure HomeBench preferences",
        section: "View" as const, 
        keywords: ["settings", "preferences", "config"],
        shortcut: ["⌘,"],
        icon: <Settings size={16} />,
        onTrigger: () => onShowSettings?.()
      }
    ];

    const unregister = register(commands);
    return unregister;
  }, [register, theme, onToggleTheme, onShowSettings]);

  // Register system commands
  useEffect(() => {
    const commands = [
      {
        id: "system-help",
        title: "Show Keyboard Shortcuts",
        subtitle: "View all available shortcuts",
        section: "System" as const,
        keywords: ["help", "shortcuts", "hotkeys"],
        shortcut: ["?"],
        icon: <HelpCircle size={16} />,
        onTrigger: () => {
          // Could open a help modal
          alert('Keyboard shortcuts:\n⌘K / F1 - Open command palette\n⌘↵ - Run query\n⇧⌘F - Format SQL\n⌘D - Toggle theme\n⌘, - Settings');
        }
      }
    ];

    const unregister = register(commands);
    return unregister;
  }, [register]);

  // Register dynamic table commands
  useEffect(() => {
    let unregister: (() => void) | undefined;

    const registerTableCommands = async () => {
      try {
        const tableActions = await getTableActions();
        if (tableActions.length > 0) {
          unregister = register(tableActions);
        }
      } catch (error) {
        console.warn('Failed to register table commands:', error);
      }
    };

    registerTableCommands();

    return () => {
      unregister?.();
    };
  }, [register, getTableActions]);
}