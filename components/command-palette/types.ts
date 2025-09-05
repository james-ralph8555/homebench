import React from 'react';

export interface Action {
  id: string;
  title: string;
  subtitle?: string;
  section: "Navigate" | "Editor" | "Database" | "Files" | "View" | "System";
  keywords?: string[];
  shortcut?: string[];             // e.g. ["mod+enter"]
  icon?: React.ReactNode;
  enabled?: boolean;               // default true
  visible?: boolean;               // default true
  onTrigger: () => void | Promise<void>;
  scoreBoost?: number;             // manual boost 0..3
}

export interface CommandPaletteContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  register: (actions: Action[] | Action) => () => void; // returns unregister function
  actions: Action[];
  bumpUsage: (id: string) => void;
}

export interface UsageMap {
  [id: string]: {
    count: number;
    last: number;
  };
}

export interface CommandPaletteProviderProps {
  children: React.ReactNode;
}