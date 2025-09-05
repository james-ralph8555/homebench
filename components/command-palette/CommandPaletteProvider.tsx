"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Action, CommandPaletteContextType, CommandPaletteProviderProps } from "./types";
import { bumpUsage, getUsageScores, usageScore } from "@/lib/queryStore";

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false);
  const [actionsMap, setActionsMap] = useState<Map<string, Action>>(new Map());
  const [usageScores, setUsageScores] = useState<Record<string, number>>({});
  const usageScoresRef = useRef<Record<string, number>>({});

  // Load usage scores on mount
  useEffect(() => {
    const loadUsageScores = async () => {
      try {
        const scores = await getUsageScores();
        setUsageScores(scores);
        usageScoresRef.current = scores;
      } catch (error) {
        console.warn('Failed to load usage scores:', error);
      }
    };
    loadUsageScores();
  }, []);

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if ((mod && e.key.toLowerCase() === "k") || e.key === "F1") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const register = useCallback((actions: Action[] | Action) => {
    const actionArray = Array.isArray(actions) ? actions : [actions];
    
    actionArray.forEach(action => {
      const actionWithDefaults: Action = {
        ...action,
        enabled: action.enabled ?? true,
        visible: action.visible ?? true
      };
      
      setActionsMap(prevMap => {
        const newMap = new Map(prevMap);
        newMap.set(action.id, actionWithDefaults);
        return newMap;
      });
    });

    // Return unregister function
    return () => {
      const actionIds = new Set(actionArray.map(a => a.id));
      setActionsMap(prevMap => {
        const newMap = new Map(prevMap);
        actionIds.forEach(id => newMap.delete(id));
        return newMap;
      });
    };
  }, []);

  const handleBumpUsage = useCallback(async (id: string) => {
    try {
      await bumpUsage(id);
      // Update local usage scores
      const newScores = await getUsageScores();
      setUsageScores(newScores);
      usageScoresRef.current = newScores;
    } catch (error) {
      console.warn('Failed to bump usage for action:', id, error);
    }
  }, []);

  // Sort actions by usage score + score boost, with enabled actions first
  const actions = useMemo(() => {
    const actionArray = Array.from(actionsMap.values()).filter(a => a.visible !== false);
    
    return actionArray.sort((a, b) => {
      const scoreA = (usageScores[a.id] || 0) + (a.scoreBoost || 0);
      const scoreB = (usageScores[b.id] || 0) + (b.scoreBoost || 0);
      
      // Enabled actions come first
      const enabledDelta = Number(!!b.enabled) - Number(!!a.enabled);
      if (enabledDelta !== 0) return enabledDelta;
      
      // Then sort by score (higher score first)
      return scoreB - scoreA;
    });
  }, [actionsMap, usageScores]);

  const value: CommandPaletteContextType = useMemo(() => ({
    open,
    setOpen,
    register,
    actions,
    bumpUsage: handleBumpUsage,
  }), [open, register, actions, handleBumpUsage]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextType {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
}
