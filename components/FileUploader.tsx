'use client';

import React, { useState, useRef } from 'react';
import { FolderIcon } from './icons';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { markTableAsUploaded } from '@/lib/tableMetadataStore';
import { createTableFromFile, createTableFromFileWithSchema } from '@/lib/durableOperations';
import { SchemaPreviewInline } from './SchemaPreviewInline';
import type { TypeOverride, ColumnInfo } from '@/lib/schemaDetection';

interface FileUploaderProps {
  onFileUploaded?: (fileName: string) => void;
  onSchemaPreviewShow?: () => void;
  onSchemaPreviewHide?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileUploaded, onSchemaPreviewShow, onSchemaPreviewHide }) => {
  const { db, multiTabStatus } = useDuckDB();
  const [message, setMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showSchemaPreview, setShowSchemaPreview] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Inline schema preview state is managed within SchemaPreviewInline
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, useSchemaPreview = true) => {
    // File uploads require direct database access for file registration
    // Only leader tabs have this capability
    if (!db) {
      if (multiTabStatus?.role === 'client') {
        setMessage('File uploads must be done from the original tab that has the database. Please switch to that tab to upload files.');
      } else {
        setMessage('Database not initialized. Please refresh the page.');
      }
      return;
    }

    // Validate file size (4GB limit for WebAssembly)
    if (file.size > 4 * 1024 * 1024 * 1024) {
      setMessage('File too large. Maximum file size is 4GB due to WebAssembly limitations.');
      return;
    }
    
    // Validate file type
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['csv', 'parquet', 'json', 'jsonl', 'ndjson'].includes(fileExt)) {
      setMessage(`Unsupported file type: ${fileExt}. Supported types: CSV, Parquet, JSON`);
      return;
    }

    if (useSchemaPreview) {
      // Show schema preview dialog
      try {
        setMessage(`Preparing schema preview for ${file.name}...`);
        await registerFile(file, fileExt);
        setPendingFile(file);
        setShowSchemaPreview(true);
        onSchemaPreviewShow?.();
        setMessage(''); // Clear message since dialog will handle UI
      } catch (error: any) {
        setMessage(`Error preparing schema preview: ${error.message}`);
      }
    } else {
      // Direct import (existing flow)
      await performDirectImport(file, fileExt);
    }
  };

  const registerFile = async (file: File, fileExt: string) => {
    if (!db) throw new Error('Database not initialized');
    
    // Dynamic import to get DuckDB constants
    const duckdb = await import('@duckdb/duckdb-wasm');
    
    // Check if file is already registered and unregister it
    try {
      await db.dropFile(file.name);
      console.log(`🧽 Dropped existing file registration: ${file.name}`);
    } catch {
      // File wasn't registered, that's fine
    }
    
    // Register the file handle with DuckDB
    await db.registerFileHandle(
      file.name,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true // Make the file persistent within the session
    );
  };

  const performDirectImport = async (file: File, fileExt: string) => {
    setIsUploading(true);
    const startTime = performance.now();
    
    try {
      setMessage(`Preparing to upload ${file.name}...`);
      
      await registerFile(file, fileExt);
      
      setMessage(`Creating table from ${file.name}...`);
      
      // Use sanitized table name (remove file extension and special chars)
      const tableName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Use durable operation to create table with guaranteed persistence
      const result = await createTableFromFile(tableName, file.name, fileExt);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create table from file');
      }

      // Mark this table as an uploaded file in metadata store
      await markTableAsUploaded(tableName, file.name);

      const duration = performance.now() - startTime;
      const rowsText = result.rowsAffected ? ` (${result.rowsAffected} rows)` : '';
      
      setMessage(`Successfully loaded ${file.name} as table "${tableName}"${rowsText} in ${duration.toFixed(0)}ms`);
      console.log(`Table "${tableName}" created from ${file.name} with durable persistence in ${duration.toFixed(2)}ms`);
      
      onFileUploaded?.(tableName);
    } catch (e: any) {
      const duration = performance.now() - startTime;
      let errorMsg = `Error loading ${file.name}: ${e.message}`;
      
      // Provide helpful error messages for common issues
      if (e.message.includes('TransactionContext') || e.message.includes('File is not opened in write mode')) {
        errorMsg = `Database write capability corrupted with ${file.name}. This usually happens after interrupted uploads. The system attempted automatic recovery. If the issue persists, refresh the page or clear OPFS data and try again.`;
      } else if (e.message.includes('maximum_object_size')) {
        errorMsg = `File ${file.name} is too large for DuckDB to process. Try a smaller file or convert to Parquet format.`;
      }
      
      setMessage(errorMsg);
      console.error(`❌ File upload failed after ${duration.toFixed(2)}ms:`, e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSchemaImport = async (columns: ColumnInfo[], typeOverrides: TypeOverride[]) => {
    if (!pendingFile) return;
    
    setIsUploading(true);
    setShowSchemaPreview(false);
    onSchemaPreviewHide?.();
    const startTime = performance.now();
    
    try {
      const fileExt = pendingFile.name.split('.').pop()?.toLowerCase() || '';
      const tableName = pendingFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
      
      setMessage(`Creating table with custom schema from ${pendingFile.name}...`);
      
      // Use the advanced function with schema support
      const result = await createTableFromFileWithSchema(
        tableName,
        pendingFile.name,
        fileExt,
        columns,
        typeOverrides
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create table from file');
      }

      // Mark this table as an uploaded file in metadata store
      await markTableAsUploaded(tableName, pendingFile.name);

      const duration = performance.now() - startTime;
      const rowsText = result.rowsAffected ? ` (${result.rowsAffected} rows)` : '';
      
      let successMessage = `Successfully loaded ${pendingFile.name} as table "${tableName}"${rowsText} in ${duration.toFixed(0)}ms`;
      
      // Add warnings if any casting issues occurred
      if (result.castWarnings && result.castWarnings.length > 0) {
        successMessage += `\n\nWarnings:\n${result.castWarnings.join('\n')}`;
      }
      
      setMessage(successMessage);
      console.log(`Table "${tableName}" created from ${pendingFile.name} with custom schema in ${duration.toFixed(2)}ms`);
      
      onFileUploaded?.(tableName);
    } catch (e: any) {
      const duration = performance.now() - startTime;
      setMessage(`Error loading ${pendingFile.name} with custom schema: ${e.message}`);
      console.error(`❌ Schema-based file upload failed after ${duration.toFixed(2)}ms:`, e);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      // No-op
    }
  };

  const handleSchemaCancel = () => {
    setShowSchemaPreview(false);
    onSchemaPreviewHide?.();
    setPendingFile(null);
    setMessage('Upload cancelled');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file, true); // Always use schema preview
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0], true); // Always use schema preview
    }
  };


  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="w-full stable-container">
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          style={{ minHeight: '180px' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".csv,.parquet,.json,.jsonl,.ndjson"
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="space-y-3">
            <div className="text-gray-400 flex justify-center">
              <FolderIcon />
            </div>
            <div>
              <p className="text-lg font-medium">
                {isUploading ? 'Processing file...' : 'Upload your data file'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag and drop or click to select CSV, Parquet, or JSON files
              </p>
            </div>
          </div>
        </div>
        
        {/* Unified flow: file selection leads to inline schema preview */}
        
        <div className="mt-4 stable-container" style={{ minHeight: message || isUploading ? 'auto' : '0px' }}>
          {(message || isUploading) && (
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
              {isUploading && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              )}
              {message && <p className="text-sm whitespace-pre-line">{message}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Inline Schema Preview */}
      {showSchemaPreview && pendingFile && (
        <SchemaPreviewInline
          fileName={pendingFile.name}
          fileExtension={pendingFile.name.split('.').pop()?.toLowerCase() || ''}
          onImport={handleSchemaImport}
          onCancel={handleSchemaCancel}
        />
      )}
    </>
  );
};
