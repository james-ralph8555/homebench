'use client';

import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Button } from '@/components/ui/Button';
import { TriangleIcon } from './icons';

interface CollapsibleSidebarProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  title,
  children,
  defaultExpanded = true,
  className = ''
}) => {
  const [open, setOpen] = React.useState(defaultExpanded);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`border rounded-lg overflow-hidden ${className}`}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between rounded-none bg-muted/40 px-4 py-3">
            <h3 className="font-semibold">{title}</h3>
            <TriangleIcon className={`transition-transform duration-200 ${open ? 'rotate-90' : 'rotate-0'}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="p-4 bg-background">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
