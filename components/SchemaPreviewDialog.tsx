'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';
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
  type TypeOverride,
  type DuckDBType
} from '@/lib/schemaDetection';

interface SchemaPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (typeOverrides: TypeOverride[]) => void;
  fileName: string;
  fileExtension: string;
  onCancel?: () => void;
}

interface ColumnTypeState {
  column: ColumnInfo;
  selectedType: string;
  hasWarning: boolean;
  warningMessage?: string;
  isModified: boolean;
}

export const SchemaPreviewDialog: React.FC<SchemaPreviewDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  fileName,
  fileExtension,
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
      const data = await detectFileSchema(fileName, fileExtension, 20); // Show more sample rows
      setSchemaData(data);
      
      // Initialize column states with detected types
      const initialStates: ColumnTypeState[] = data.columns.map(column => ({
        column,
        selectedType: column.column_type,
        hasWarning: false,
        isModified: false
      }));
      
      setColumnStates(initialStates);
    } catch (error: any) {
      console.error('Failed to load schema:', error);
      setError(error.message || 'Failed to detect file schema');
    } finally {
      setLoading(false);
    }
  }, [fileName, fileExtension]);

  // Load schema data when dialog opens
  useEffect(() => {
    if (isOpen && fileName) {
      loadSchemaData();
    }
  }, [isOpen, fileName, fileExtension, loadSchemaData]);

  const handleTypeChange = (columnName: string, newType: string) => {
    setColumnStates(prev => prev.map(state => {
      if (state.column.column_name === columnName) {
        // Validate the type change using sample data
        let hasWarning = false;
        let warningMessage: string | undefined;
        
        if (schemaData && schemaData.sampleData.length > 0) {
          // Check the first few non-null values for validation
          const sampleValues = schemaData.sampleData
            .map(row => row[columnName])
            .filter(val => val !== null && val !== undefined)
            .slice(0, 3);
            
          for (const sampleValue of sampleValues) {
            const validation = validateTypeConversion(sampleValue, newType);
            if (!validation.isValid || validation.warning) {
              hasWarning = true;
              warningMessage = validation.warning || `Cannot convert sample value "${sampleValue}" to ${newType}`;
              break;
            }
          }
        }
        
        return {
          ...state,
          selectedType: newType,
          hasWarning,
          warningMessage,
          isModified: newType !== state.column.column_type
        };
      }
      return state;
    }));
  };

  const handleImport = () => {
    // Generate type overrides for modified columns
    const typeOverrides: TypeOverride[] = columnStates
      .filter(state => state.isModified)
      .map(state => ({
        columnName: state.column.column_name,
        newType: state.selectedType
      }));
    
    onImport(typeOverrides);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Schema Preview</DialogTitle>
          <DialogDescription>
            Review and customize the data types for {fileName} before importing.
            {schemaData?.rowCount && ` File contains ${schemaData.rowCount.toLocaleString()} rows.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <div className="text-sm text-muted-foreground">
                Analyzing file schema...
              </div>
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadSchemaData}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          )}

          {schemaData && !loading && !error && (
            <div className="space-y-6">
              {/* Schema Table */}
              <div>
                <h3 className="text-lg font-medium mb-3">Column Types</h3>
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
                      {columnStates.map((state, index) => (
                        <TableRow key={state.column.column_name}>
                          <TableCell className="p-2 font-medium">
                            {state.column.column_name}
                          </TableCell>
                          <TableCell className="p-2 text-muted-foreground">
                            {state.column.column_type}
                          </TableCell>
                          <TableCell className="p-2">
                            <Select 
                              value={state.selectedType}
                              onValueChange={(value) => handleTypeChange(state.column.column_name, value)}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DUCKDB_TYPES.map(type => (
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

              {/* Sample Data */}
              {schemaData.sampleData && schemaData.sampleData.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Sample Data</h3>
                  <ScrollArea className="h-96 border rounded-md">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          {columnStates.map(state => (
                            <TableHead key={state.column.column_name} className="h-10 px-3">
                              {state.column.column_name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schemaData.sampleData.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {columnStates.map(state => (
                              <TableCell 
                                key={state.column.column_name} 
                                className="p-2 text-xs max-w-32 truncate"
                                title={String(row[state.column.column_name] || '')}
                              >
                                {row[state.column.column_name] === null || row[state.column.column_name] === undefined
                                  ? <span className="text-muted-foreground italic">null</span>
                                  : String(row[state.column.column_name])
                                }
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

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={loading || !!error}
          >
            Import with Custom Types
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
