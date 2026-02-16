'use client';

import React, { useState } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { checkRemoteSource, generateTableNameFromUrl, type RemotePreflightResult } from '@/lib/remotePreflight';
import { createTableFromFile } from '@/lib/durableOperations';
import { markTableAsUploaded } from '@/lib/tableMetadataStore';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/utils';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface RemoteUrlInputProps {
  onFileUploaded?: (tableName: string) => void;
}

export const RemoteUrlInput: React.FC<RemoteUrlInputProps> = ({ onFileUploaded }) => {
  const { db, isReady, initializationStage, multiTabStatus } = useDuckDB();
  const [url, setUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preflightResult, setPreflightResult] = useState<RemotePreflightResult | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleCheckUrl = async () => {
    if (!url.trim()) return;

    setIsChecking(true);
    setPreflightResult(null);
    setUploadMessage('');

    try {
      const result = await checkRemoteSource(url.trim());
      setPreflightResult(result);

      if (result.canLoad) {
        logger.info('Remote URL preflight passed:', result);
      }
    } catch (e) {
      logger.error('Preflight check error:', e);
      setPreflightResult({
        canLoad: false,
        status: 'unknown_error',
        message: 'Failed to check URL',
        details: e instanceof Error ? e.message : String(e),
        url: url.trim(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLoadRemote = async () => {
    if (!preflightResult?.canLoad) return;

    if (!isReady || !db) {
      const reason = multiTabStatus?.role === 'client'
        ? 'Remote imports must be done from the original tab that has the database.'
        : initializationStage === 'loading'
          ? 'Database is still loading. Please wait.'
          : 'Database not ready. Please refresh.';
      setUploadMessage(reason);
      return;
    }

    setIsUploading(true);
    setUploadMessage('');
    const startTime = performance.now();

    try {
      const tableName = generateTableNameFromUrl(preflightResult.url);
      const fileType = preflightResult.detectedFileType || 'csv';
      const fileName = `${tableName}.${fileType}`;

      setUploadMessage(`Fetching remote data...`);

      // Fetch the remote file using browser fetch (CORS already validated by preflight)
      const response = await fetch(preflightResult.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote data: ${response.status} ${response.statusText}`);
      }

      // Get the file data as ArrayBuffer for registerFileBuffer
      const arrayBuffer = await response.arrayBuffer();

      setUploadMessage(`Registering file with database...`);

      // Check if file is already registered and unregister it
      try {
        await db.dropFile(fileName);
        logger.debug(`Dropped existing file registration: ${fileName}`);
      } catch {
        // File wasn't registered, that's fine
      }

      // Register the file buffer with DuckDB - this bypasses BROWSER_FILEREADER issues
      await db.registerFileBuffer(fileName, new Uint8Array(arrayBuffer));

      setUploadMessage(`Loading data into table "${tableName}"...`);

      // Use the same function as local file uploads
      const result = await createTableFromFile(tableName, fileName, fileType);

      if (!result.success) {
        throw new Error(toErrorMessage(result.error) || 'Failed to load remote data');
      }

      await markTableAsUploaded(tableName, preflightResult.url);

      const duration = performance.now() - startTime;
      const rowsText = result.rowsAffected ? ` (${result.rowsAffected} rows)` : '';

      setUploadMessage(`Successfully loaded remote data as table "${tableName}"${rowsText} in ${(duration / 1000).toFixed(1)}s`);
      logger.info(`Remote table "${tableName}" created in ${duration.toFixed(2)}ms`);

      // Clear URL and result on success
      setUrl('');
      setPreflightResult(null);
      onFileUploaded?.(tableName);
    } catch (e) {
      const duration = performance.now() - startTime;
      const errorMsg = e instanceof Error ? e.message : String(e);
      setUploadMessage(`Error loading remote data: ${errorMsg}`);
      logger.error(`Remote import failed after ${duration.toFixed(2)}ms:`, e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && !isChecking && !isUploading) {
      if (preflightResult?.canLoad) {
        handleLoadRemote();
      } else {
        handleCheckUrl();
      }
    }
  };

  const handleClear = () => {
    setUrl('');
    setPreflightResult(null);
    setUploadMessage('');
  };

  const isDisabled = !isReady || isChecking || isUploading;
  const isClientTab = multiTabStatus?.role === 'client';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://example.com/data.csv"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreflightResult(null);
            setUploadMessage('');
          }}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className="flex-1"
        />
        {url && !isChecking && !isUploading && (
          <Button variant="outline" onClick={handleClear} disabled={isDisabled}>
            Clear
          </Button>
        )}
        <Button
          onClick={preflightResult?.canLoad ? handleLoadRemote : handleCheckUrl}
          disabled={!url.trim() || isDisabled}
        >
          {isChecking ? 'Checking...' : isUploading ? 'Loading...' : preflightResult?.canLoad ? 'Load' : 'Check'}
        </Button>
      </div>

      {isClientTab && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Remote imports must be done from the original tab that has the database.
        </p>
      )}

      {preflightResult && (
        <div
          className={`p-3 rounded-md text-sm ${
            preflightResult.canLoad
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className={preflightResult.canLoad ? 'text-green-600' : 'text-red-600'}>
              {preflightResult.canLoad ? '✓' : '✗'}
            </span>
            <div className="flex-1">
              <p className="font-medium">{preflightResult.message}</p>
              {preflightResult.details && (
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  {preflightResult.details}
                </p>
              )}
              {preflightResult.guidance && (
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-xs mt-2 font-mono bg-white/50 dark:bg-black/20 p-2 rounded">
                  {preflightResult.guidance}
                </pre>
              )}
              {preflightResult.canLoad && preflightResult.contentLength && (
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  File size: {(preflightResult.contentLength / 1024 / 1024).toFixed(2)} MB
                  {preflightResult.detectedFileType && ` • Type: ${preflightResult.detectedFileType.toUpperCase()}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadMessage && !preflightResult && (
        <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 text-sm">
          {isUploading && (
            <div className="flex items-center gap-2 mb-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              <span className="font-medium">Processing...</span>
            </div>
          )}
          <p>{uploadMessage}</p>
        </div>
      )}
    </div>
  );
};
