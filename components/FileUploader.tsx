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
  const { db } = useDuckDB();
  const [message, setMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!db) {
      setMessage('Database not initialized.');
      return;
    }

    setIsUploading(true);
    const startTime = performance.now();
    
    try {
      setMessage(`Registering file: ${file.name}...`);
      
      // Dynamic import to get DuckDB constants
      const duckdb = await import('@duckdb/duckdb-wasm');
      
      // Register the file handle with DuckDB
      await db.registerFileHandle(
        file.name,
        file,
        duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
        true // Make the file persistent within the session
      );
      
      setMessage(`Creating table from ${file.name}...`);
      
      // Use durable operation to create table with guaranteed persistence
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const result = await createTableFromFile(file.name, file.name, fileExt);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create table from file');
      }

      // Mark this table as an uploaded file in metadata store
      await markTableAsUploaded(file.name, file.name);

      const duration = performance.now() - startTime;
      const rowsText = result.rowsAffected ? ` (${result.rowsAffected} rows)` : '';
      
      setMessage(`✅ Successfully loaded ${file.name} as a table${rowsText} in ${duration.toFixed(0)}ms`);
      console.log(`📊 Table "${file.name}" created with durable persistence in ${duration.toFixed(2)}ms`);
      
      onFileUploaded?.(file.name);
    } catch (e: any) {
      const duration = performance.now() - startTime;
      const errorMsg = `Error loading ${file.name}: ${e.message}`;
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
    <div className="w-full">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
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
      
      {message && (
        <div className="mt-4 p-3 rounded-md bg-gray-50 dark:bg-gray-800">
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
  );
};
