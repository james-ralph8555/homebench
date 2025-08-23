'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { ChartConfig, detectColumnTypes } from '@/lib/plotlyTransform';
import { Table as ArrowTable } from 'apache-arrow';

interface ChartConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  data: ArrowTable | null;
  children?: React.ReactNode;
}

interface ColumnSelectorProps {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  required?: boolean;
  columnTypes?: Record<string, 'numeric' | 'string' | 'datetime' | 'boolean'>;
  preferredTypes?: ('numeric' | 'string' | 'datetime' | 'boolean')[];
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select column',
  required = false,
  columnTypes = {},
  preferredTypes = []
}) => {
  // Sort options to show preferred types first
  const sortedOptions = [...options].sort((a, b) => {
    const aType = columnTypes[a];
    const bType = columnTypes[b];
    const aPreferred = preferredTypes.includes(aType);
    const bPreferred = preferredTypes.includes(bType);
    
    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    return a.localeCompare(b);
  });

  const getColumnTypeIcon = (columnType: string) => {
    switch (columnType) {
      case 'numeric': return '🔢';
      case 'string': return '📝';
      case 'datetime': return '📅';
      case 'boolean': return '✅';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left"
          >
            <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
              {value ? (
                <div className="flex items-center space-x-2">
                  <span>{getColumnTypeIcon(columnTypes[value])}</span>
                  <span>{value}</span>
                </div>
              ) : (
                placeholder
              )}
            </span>
            <svg className="ml-auto w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-full min-w-[200px]">
          {value && (
            <>
              <DropdownMenuItem onClick={() => onChange(undefined)} className="text-red-600">
                Clear selection
              </DropdownMenuItem>
              <Separator />
            </>
          )}
          
          {sortedOptions.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => onChange(option)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <span>{getColumnTypeIcon(columnTypes[option])}</span>
                <span>{option}</span>
              </div>
              {preferredTypes.includes(columnTypes[option]) && (
                <span className="text-xs text-blue-600 dark:text-blue-400">recommended</span>
              )}
              {option === value && (
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const TextInput: React.FC<{
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);

export const ChartConfigModal: React.FC<ChartConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  data,
  children
}) => {
  const [localConfig, setLocalConfig] = useState<ChartConfig>(config);

  const columnTypes = React.useMemo(() => {
    return data ? detectColumnTypes(data) : {};
  }, [data]);

  const availableColumns = React.useMemo(() => {
    return data ? data.schema.fields.map(field => field.name) : [];
  }, [data]);

  const updateConfig = useCallback((updates: Partial<ChartConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleApply = useCallback(() => {
    onConfigChange(localConfig);
    onClose();
  }, [localConfig, onConfigChange, onClose]);

  const handleReset = useCallback(() => {
    setLocalConfig(config);
  }, [config]);

  // Reset local config when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  const getPreferredTypesForChart = (chartType: ChartConfig['type'], axis: 'x' | 'y'): ('numeric' | 'string' | 'datetime' | 'boolean')[] => {
    switch (chartType) {
      case 'scatter':
        return ['numeric'];
      case 'line':
        if (axis === 'x') return ['datetime', 'numeric'];
        return ['numeric'];
      case 'bar':
        if (axis === 'x') return ['string', 'datetime'];
        return ['numeric'];
      case 'pie':
        if (axis === 'x') return ['string'];
        return ['numeric'];
      case 'histogram':
        return ['numeric'];
      default:
        return [];
    }
  };

  if (!data) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chart Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Chart Type Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Chart Type: {localConfig.type}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {localConfig.type === 'scatter' && 'Show relationships between two numeric variables'}
              {localConfig.type === 'line' && 'Show trends over time or continuous data'}
              {localConfig.type === 'bar' && 'Compare categories or groups'}
              {localConfig.type === 'pie' && 'Show proportions of a whole'}
              {localConfig.type === 'histogram' && 'Show distribution of a single variable'}
            </p>
          </div>

          {/* Data Mapping */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Data Mapping</h3>
            
            {localConfig.type !== 'histogram' && (
              <ColumnSelector
                label="X-Axis Column"
                value={localConfig.xColumn}
                options={availableColumns}
                onChange={(value) => updateConfig({ xColumn: value })}
                placeholder="Select X column"
                required
                columnTypes={columnTypes}
                preferredTypes={getPreferredTypesForChart(localConfig.type, 'x')}
              />
            )}

            {localConfig.type !== 'histogram' && (
              <ColumnSelector
                label="Y-Axis Column"
                value={localConfig.yColumn}
                options={availableColumns}
                onChange={(value) => updateConfig({ yColumn: value })}
                placeholder="Select Y column"
                required
                columnTypes={columnTypes}
                preferredTypes={getPreferredTypesForChart(localConfig.type, 'y')}
              />
            )}

            {localConfig.type === 'histogram' && (
              <ColumnSelector
                label="Column to Analyze"
                value={localConfig.xColumn}
                options={availableColumns}
                onChange={(value) => updateConfig({ xColumn: value })}
                placeholder="Select column for histogram"
                required
                columnTypes={columnTypes}
                preferredTypes={['numeric']}
              />
            )}

            {localConfig.type === 'scatter' && (
              <>
                <ColumnSelector
                  label="Color Column (Optional)"
                  value={localConfig.colorColumn}
                  options={availableColumns}
                  onChange={(value) => updateConfig({ colorColumn: value })}
                  placeholder="Color points by column"
                  columnTypes={columnTypes}
                />

                <ColumnSelector
                  label="Size Column (Optional)"
                  value={localConfig.sizeColumn}
                  options={availableColumns}
                  onChange={(value) => updateConfig({ sizeColumn: value })}
                  placeholder="Size points by column"
                  columnTypes={columnTypes}
                  preferredTypes={['numeric']}
                />
              </>
            )}
          </div>

          <Separator />

          {/* Chart Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appearance</h3>
            
            <TextInput
              label="Chart Title"
              value={localConfig.title}
              onChange={(value) => updateConfig({ title: value })}
              placeholder="Enter chart title"
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="X-Axis Title"
                value={localConfig.xTitle}
                onChange={(value) => updateConfig({ xTitle: value })}
                placeholder="X-axis label"
              />
              
              {localConfig.type !== 'histogram' && (
                <TextInput
                  label="Y-Axis Title"
                  value={localConfig.yTitle}
                  onChange={(value) => updateConfig({ yTitle: value })}
                  placeholder="Y-axis label"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Show Legend</Label>
              <Switch
                checked={localConfig.showLegend !== false}
                onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Performance Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Use WebGL Rendering</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Improves performance for large datasets (recommended for {'>'}10k points)
                </p>
              </div>
              <Switch
                checked={localConfig.useWebGL || false}
                onCheckedChange={(checked) => updateConfig({ useWebGL: checked })}
              />
            </div>

            {data && data.numRows > 50000 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ Large dataset detected ({data.numRows.toLocaleString()} rows). 
                  WebGL rendering is recommended for optimal performance.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartConfigModal;