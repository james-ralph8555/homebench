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
  const [isClient, setIsClient] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia('(max-width: 1279px)').matches;
      setIsMobile(mobile);
      setIsOpen(mobile ? false : defaultExpanded);
    };
    
    checkMobile();
    setIsClient(true);
    
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    mediaQuery.addEventListener('change', checkMobile);
    
    return () => mediaQuery.removeEventListener('change', checkMobile);
  }, [defaultExpanded]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg overflow-hidden ${className}`}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between rounded-none bg-muted/40 px-4 py-3 group">
            <h3 className="font-semibold">{title}</h3>
            <TriangleIcon className="transition-transform duration-200 group-data-[state=open]:rotate-90 group-data-[state=closed]:rotate-0" />
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
