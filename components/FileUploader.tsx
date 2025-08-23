'use client';

import React, { useState, useRef } from 'react';
import { FolderIcon } from './icons';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { markTableAsUploaded } from '@/lib/tableMetadataStore';
import { createTableFromFile } from '@/lib/durableOperations';

interface FileUploaderProps {
  onFileUploaded?: (fileName: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileUploaded }) => {
  const { db, multiTabStatus } = useDuckDB();
  const [message, setMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
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

    setIsUploading(true);
    const startTime = performance.now();
    
    try {
      setMessage(`Preparing to upload ${file.name}...`);
      
      // Validate file size (4GB limit for WebAssembly)
      if (file.size > 4 * 1024 * 1024 * 1024) {
        throw new Error('File too large. Maximum file size is 4GB due to WebAssembly limitations.');
      }
      
      // Validate file type
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['csv', 'parquet', 'json', 'jsonl', 'ndjson'].includes(fileExt)) {
        throw new Error(`Unsupported file type: ${fileExt}. Supported types: CSV, Parquet, JSON`);
      }
      
      
      setMessage(`Registering file: ${file.name}...`);
      
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
      if (e.message.includes('TransactionContext')) {
        errorMsg = `Database transaction error with ${file.name}. Try refreshing the page and uploading again.`;
      } else if (e.message.includes('maximum_object_size')) {
        errorMsg = `File ${file.name} is too large for DuckDB to process. Try a smaller file or convert to Parquet format.`;
      } else if (e.message.includes('File is not opened in write mode')) {
        errorMsg = `Database connection error. Please refresh the page and try uploading ${file.name} again.`;
      }
      
      setMessage(errorMsg);
      console.error(`❌ File upload failed after ${duration.toFixed(2)}ms:`, e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
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
        style={{ minHeight: '160px' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".csv,.parquet,.json"
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
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
      
      <div className="mt-4 stable-container" style={{ minHeight: message ? 'auto' : '0px' }}>
        {message && (
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
            <p className="text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
