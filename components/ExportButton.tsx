'use client';

import React, { useState } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { exportQueryAsFile, suggestFileName, ExportFormat } from '@/lib/exportUtils';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';

interface ExportButtonProps {
  query: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ query, disabled }) => {
  const { db, multiTabStatus } = useDuckDB();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (!db || !query.trim()) return;

    setIsExporting(true);

    try {
      const fileName = suggestFileName(query, format);
      await exportQueryAsFile(db, query, fileName, format);
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Database download moved to Session Storage panel

  const exportOptions: { format: ExportFormat; label: string; description: string }[] = [
    { format: 'CSV', label: 'CSV', description: 'Comma-separated values' },
    { format: 'PARQUET', label: 'Parquet', description: 'Columnar binary format' },
    { format: 'JSON', label: 'JSON', description: 'JavaScript Object Notation' },
  ];

  const isClientTab = multiTabStatus?.role === 'client';
  const isButtonDisabled = disabled || isExporting || !query.trim() || isClientTab;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          disabled={isButtonDisabled}
          className="w-[120px]"
          title={isClientTab ? 'Export from main tab' : undefined}
        >
          {isExporting ? (
            <span className="inline-flex items-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Exporting...
            </span>
          ) : isClientTab ? (
            'Export (main tab)'
          ) : (
            'Export'
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {exportOptions.map((option) => (
          <DropdownMenuItem key={option.format} onSelect={(e) => { e.preventDefault(); handleExport(option.format); }} className="flex flex-col items-start">
            <span className="font-medium">{option.label}</span>
            <span className="text-sm text-muted-foreground">{option.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
