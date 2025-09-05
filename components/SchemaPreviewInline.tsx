'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/Table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  detectFileSchema,
  validateTypeConversion,
  DUCKDB_TYPES,
  type SchemaPreviewData,
  type ColumnInfo,
  type TypeOverride
} from '@/lib/schemaDetection';

interface SchemaPreviewInlineProps {
  fileName: string;
  fileExtension: string;
  onImport: (columns: ColumnInfo[], typeOverrides: TypeOverride[]) => void;
  onCancel: () => void;
}

interface ColumnTypeState {
  column: ColumnInfo;
  selectedType: string;
  hasWarning: boolean;
  warningMessage?: string;
  isModified: boolean;
}

export const SchemaPreviewInline: React.FC<SchemaPreviewInlineProps> = ({
  fileName,
  fileExtension,
  onImport,
  onCancel
}) => {
  const [schemaData, setSchemaData] = useState<SchemaPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnStates, setColumnStates] = useState<ColumnTypeState[]>([]);

  const loadSchemaData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await detectFileSchema(fileName, fileExtension, 20);
      setSchemaData(data);

      const initialStates: ColumnTypeState[] = data.columns.map((column) => ({
        column,
        selectedType: column.column_type,
        hasWarning: false,
        isModified: false,
      }));

      setColumnStates(initialStates);
    } catch (e: any) {
      console.error('Failed to load schema:', e);
      setError(e.message || 'Failed to detect file schema');
    } finally {
      setLoading(false);
    }
  }, [fileName, fileExtension]);

  useEffect(() => {
    if (fileName) {
      loadSchemaData();
    }
  }, [fileName, fileExtension, loadSchemaData]);

  const handleTypeChange = (columnName: string, newType: string) => {
    setColumnStates((prev) =>
      prev.map((state) => {
        if (state.column.column_name === columnName) {
          let hasWarning = false;
          let warningMessage: string | undefined;

          if (schemaData && schemaData.sampleData.length > 0) {
            const sampleValues = schemaData.sampleData
              .map((row) => row[columnName])
              .filter((val) => val !== null && val !== undefined)
              .slice(0, 3);

            for (const sampleValue of sampleValues) {
              const validation = validateTypeConversion(sampleValue, newType);
              if (!validation.isValid || validation.warning) {
                hasWarning = true;
                warningMessage =
                  validation.warning ||
                  `Cannot convert sample value "${sampleValue}" to ${newType}`;
                break;
              }
            }
          }

          return {
            ...state,
            selectedType: newType,
            hasWarning,
            warningMessage,
            isModified: newType !== state.column.column_type,
          };
        }
        return state;
      })
    );
  };

  const handleImport = () => {
    const typeOverrides: TypeOverride[] = columnStates
      .filter((state) => state.isModified)
      .map((state) => ({ columnName: state.column.column_name, newType: state.selectedType }));

    const columns = columnStates.map((s) => s.column);
    onImport(columns, typeOverrides);
  };

  return (
    <div className="mt-6 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Schema Preview</h3>
          <p className="text-sm text-muted-foreground">
            Review and customize column types for {fileName}
            {schemaData?.rowCount ? ` • ${schemaData.rowCount.toLocaleString()} rows` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleImport} disabled={loading || !!error}>
            Import with Custom Types
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <div className="text-sm text-muted-foreground">Analyzing file schema...</div>
          <div className="text-xs text-muted-foreground mt-1">
            Reading first few rows to detect column types
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-sm text-destructive text-center">
            <p className="font-medium mb-2">Schema Detection Failed</p>
            <p>{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadSchemaData} className="mt-4">
            Retry
          </Button>
        </div>
      )}

      {schemaData && !loading && !error && (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-medium mb-3">Column Types</h4>
            <ScrollArea className="h-96 border rounded-md">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 px-3">Column Name</TableHead>
                    <TableHead className="h-10 px-3">Detected Type</TableHead>
                    <TableHead className="h-10 px-3">Selected Type</TableHead>
                    <TableHead className="h-10 px-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnStates.map((state) => (
                    <TableRow key={state.column.column_name}>
                      <TableCell className="p-2 font-medium">{state.column.column_name}</TableCell>
                      <TableCell className="p-2 text-muted-foreground">{state.column.column_type}</TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={state.selectedType}
                          onValueChange={(value) =>
                            handleTypeChange(state.column.column_name, value)
                          }
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DUCKDB_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        {state.isModified && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                              Modified
                            </span>
                            {state.hasWarning && (
                              <span
                                className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded cursor-help"
                                title={state.warningMessage}
                              >
                                Warning
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {schemaData.sampleData && schemaData.sampleData.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3">Sample Data</h4>
              <ScrollArea className="h-96 border rounded-md">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {columnStates.map((state) => (
                        <TableHead key={state.column.column_name} className="h-10 px-3">
                          {state.column.column_name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemaData.sampleData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {columnStates.map((state) => (
                          <TableCell
                            key={state.column.column_name}
                            className="p-2 text-xs max-w-32 truncate"
                            title={String(row[state.column.column_name] || '')}
                          >
                            {row[state.column.column_name] === null ||
                            row[state.column.column_name] === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : (
                              String(row[state.column.column_name])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaPreviewInline;
