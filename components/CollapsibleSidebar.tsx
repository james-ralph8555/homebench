'use client';

import React, { useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left flex items-center justify-between"
      >
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <span className="transition-transform duration-200">
          {isExpanded ? '▼' : '◀'}
        </span>
      </button>
      
      <div className={`transition-all duration-200 overflow-hidden ${
        isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-4 bg-white dark:bg-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
};
