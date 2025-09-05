"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPalette } from "./CommandPaletteProvider";

export default function CommandPalette() {
  const { open, setOpen, actions, bumpUsage } = useCommandPalette();
  const [query, setQuery] = useState("");

  // Prefix filtering logic
  const mode = query.startsWith(">") ? "Navigate"
            : query.startsWith(":") ? "Editor"
            : query.startsWith("#") ? "Database"
            : query.startsWith("/") ? "Files"
            : undefined;

  // Filter actions based on mode and search query
  const filteredActions = useMemo(() => {
    const searchQuery = query.replace(/^[:>#/]/, "").trim().toLowerCase();
    
    return actions.filter(action => {
      // Apply mode filter
      if (mode && action.section !== mode) return false;
      
      // If no search query, show all actions for the mode
      if (!searchQuery) return true;
      
      // Search in title, subtitle, and keywords
      const searchContent = [
        action.title,
        action.subtitle || "",
        ...(action.keywords || [])
      ].join(" ").toLowerCase();
      
      return searchContent.includes(searchQuery);
    });
  }, [actions, query, mode]);

  // Group filtered actions by section
  const groupedActions = useMemo(() => {
    const groups = new Map<string, typeof filteredActions>();
    
    for (const action of filteredActions) {
      if (!groups.has(action.section)) {
        groups.set(action.section, []);
      }
      groups.get(action.section)!.push(action);
    }
    
    return Array.from(groups.entries());
  }, [filteredActions]);

  // Clear query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleActionSelect = async (action: typeof actions[0]) => {
    try {
      await action.onTrigger();
      await bumpUsage(action.id);
    } catch (error) {
      console.error("Failed to execute action:", action.id, error);
    } finally {
      setOpen(false);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command…  > go to   : sql   # tables   / files" 
        value={query} 
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groupedActions.map(([section, sectionActions], groupIndex) => (
          <div key={section}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={section}>
              {sectionActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.title + " " + (action.subtitle || "")} // For cmdk search
                  disabled={action.enabled === false}
                  onSelect={() => handleActionSelect(action)}
                >
                  {action.icon && (
                    <span className="mr-2 flex h-4 w-4 items-center justify-center">
                      {action.icon}
                    </span>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm">{action.title}</span>
                    {action.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {action.subtitle}
                      </span>
                    )}
                  </div>
                  {action.shortcut && action.shortcut.length > 0 && (
                    <CommandShortcut>
                      {action.shortcut.join(" ")}
                    </CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}