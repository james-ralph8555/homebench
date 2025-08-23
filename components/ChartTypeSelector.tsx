'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { ChartConfig } from '@/lib/plotlyTransform';

interface ChartTypeOption {
  type: ChartConfig['type'];
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresXY: boolean;
}

const chartTypes: ChartTypeOption[] = [
  {
    type: 'scatter',
    label: 'Scatter Plot',
    description: 'Show relationships between two numeric variables',
    requiresXY: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M7 7l1.5 1.5L7 10M7 17l1.5-1.5L7 14M17 7l-1.5 1.5L17 10M17 17l-1.5-1.5L17 14" />
      </svg>
    )
  },
  {
    type: 'line',
    label: 'Line Chart',
    description: 'Show trends over time or continuous data',
    requiresXY: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M7 12l3-3 3 3 4-4" />
      </svg>
    )
  },
  {
    type: 'bar',
    label: 'Bar Chart',
    description: 'Compare categories or groups',
    requiresXY: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    type: 'pie',
    label: 'Pie Chart',
    description: 'Show proportions of a whole',
    requiresXY: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    )
  },
  {
    type: 'histogram',
    label: 'Histogram',
    description: 'Show distribution of a single variable',
    requiresXY: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M7 4v16l4-4V8l4 4V4l4 4v8" />
      </svg>
    )
  }
];

interface ChartTypeSelectorProps {
  selectedType: ChartConfig['type'];
  onTypeChange: (type: ChartConfig['type']) => void;
  availableColumns?: string[];
  className?: string;
  disabled?: boolean;
}

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  availableColumns = [],
  className = '',
  disabled = false
}) => {
  const selectedOption = chartTypes.find(option => option.type === selectedType);
  
  // Filter chart types based on available data
  const availableChartTypes = chartTypes.filter(chartType => {
    if (chartType.requiresXY && availableColumns.length < 2) {
      return false;
    }
    return true;
  });

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Chart Type
      </label>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled || availableChartTypes.length === 0}
            className="justify-start text-left"
          >
            <div className="flex items-center space-x-2">
              {selectedOption?.icon}
              <span>{selectedOption?.label || 'Select chart type'}</span>
            </div>
            <svg className="ml-auto w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80">
          {availableChartTypes.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No chart types available. Need at least 2 columns for most charts.
            </div>
          ) : (
            availableChartTypes.map((option) => (
              <DropdownMenuItem
                key={option.type}
                onClick={() => onTypeChange(option.type)}
                className="flex flex-col items-start space-y-1 p-3"
              >
                <div className="flex items-center space-x-2 w-full">
                  {option.icon}
                  <span className="font-medium">{option.label}</span>
                  {option.type === selectedType && (
                    <svg className="ml-auto w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {option.description}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedOption && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <strong>Selected:</strong> {selectedOption.description}
          {selectedOption.requiresXY && (
            <div className="mt-1">
              Requires: X and Y axis columns
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Quick action buttons for common chart types
interface QuickChartButtonsProps {
  onTypeChange: (type: ChartConfig['type']) => void;
  availableColumns?: string[];
  className?: string;
  disabled?: boolean;
}

export const QuickChartButtons: React.FC<QuickChartButtonsProps> = ({
  onTypeChange,
  availableColumns = [],
  className = '',
  disabled = false
}) => {
  const hasEnoughColumns = availableColumns.length >= 2;
  
  const quickTypes = [
    { type: 'scatter' as const, icon: '•', label: 'Scatter', needsXY: true },
    { type: 'line' as const, icon: '📈', label: 'Line', needsXY: true },
    { type: 'bar' as const, icon: '📊', label: 'Bar', needsXY: true },
    { type: 'histogram' as const, icon: '📋', label: 'Histogram', needsXY: false }
  ];

  return (
    <div className={`flex space-x-2 ${className}`}>
      {quickTypes.map((type) => (
        <Button
          key={type.type}
          variant="outline"
          size="sm"
          onClick={() => onTypeChange(type.type)}
          disabled={disabled || (type.needsXY && !hasEnoughColumns)}
          className="flex items-center space-x-1"
          title={`Create ${type.label} chart`}
        >
          <span>{type.icon}</span>
          <span>{type.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default ChartTypeSelector;