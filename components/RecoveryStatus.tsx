'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  getRecoveryMachine,
  type RecoveryStateInfo,
  type RecoveryAction,
  type RecoveryDiagnostics,
} from '@/lib/recoveryStateMachine';
import { wipeOpfsData, downloadSavedSessionAsDuckDB } from '@/lib/opfsUtils';
import { logger } from '@/lib/logger';

const STATE_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 dark:bg-green-900 border-green-500',
  detected: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500',
  recoverable: 'bg-blue-100 dark:bg-blue-900 border-blue-500',
  unrecoverable: 'bg-red-100 dark:bg-red-900 border-red-500',
  recovering: 'bg-blue-100 dark:bg-blue-900 border-blue-500',
  recovered: 'bg-green-100 dark:bg-green-900 border-green-500',
  failed: 'bg-red-100 dark:bg-red-900 border-red-500',
  degraded: 'bg-orange-100 dark:bg-orange-900 border-orange-500',
};

const STATE_ICONS: Record<string, string> = {
  healthy: '✓',
  detected: '?',
  recoverable: '↻',
  unrecoverable: '✕',
  recovering: '⋯',
  recovered: '✓',
  failed: '!',
  degraded: '⚠',
};

export const RecoveryStatus: React.FC = () => {
  const [stateInfo, setStateInfo] = useState<RecoveryStateInfo | null>(null);
  const [diagnostics, setDiagnostics] = useState<RecoveryDiagnostics | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const machine = getRecoveryMachine();
    const unsubscribe = machine.subscribe((info) => {
      setStateInfo(info);
      if (info.state === 'healthy') {
        setDiagnostics(null);
        setError(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleAction = useCallback(async (action: RecoveryAction) => {
    if (action.destructive) {
      setShowConfirmReset(true);
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const machine = getRecoveryMachine();

      if (action.id === 'diagnose') {
        const diag = await machine.runDiagnostics();
        setDiagnostics(diag);
        await machine.evaluateRecoverability();
      } else if (action.id === 'retry_checkpoint') {
        const result = await machine.attemptRecovery('checkpoint');
        if (!result) {
          setError('Checkpoint failed. Try reconnecting or exporting your data.');
        }
      } else if (action.id === 'reconnect') {
        const result = await machine.attemptRecovery('reconnect');
        if (!result) {
          setError('Reconnection failed. Try exporting your data before resetting.');
        }
      } else if (action.id === 'export_backup') {
        await downloadSavedSessionAsDuckDB();
      } else if (action.id === 'retry_recovery') {
        await machine.evaluateRecoverability();
        if (machine.getState().state === 'recoverable') {
          const result = await machine.attemptRecovery('checkpoint');
          if (!result) {
            setError('Recovery retry failed.');
          }
        }
      } else if (action.id === 'dismiss') {
        machine.reset();
      } else {
        const result = await machine.executeAction(action.id);
        if (!result.success) {
          setError(result.message);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      logger.error('Recovery action failed:', e);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const handleConfirmedReset = useCallback(async () => {
    setShowConfirmReset(false);
    setIsExecuting(true);
    setError(null);

    try {
      await wipeOpfsData();
      logger.info('OPFS data wiped via recovery UI');
      window.location.reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Failed to reset: ${message}`);
      logger.error('Reset failed:', e);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  if (!stateInfo || stateInfo.state === 'healthy') {
    return null;
  }

  const isDegraded = stateInfo.isInMemoryFallback;
  const effectiveState = isDegraded ? 'degraded' : stateInfo.state;
  const colorClass = STATE_COLORS[effectiveState] || STATE_COLORS.detected;
  const icon = STATE_ICONS[effectiveState] || '?';

  return (
    <>
      <div className={`border-l-4 p-4 mb-4 ${colorClass}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">
              {isDegraded && 'Running in Degraded Mode'}
              {!isDegraded && stateInfo.state === 'detected' && 'Database Issue Detected'}
              {!isDegraded && stateInfo.state === 'recoverable' && 'Recovery Available'}
              {!isDegraded && stateInfo.state === 'unrecoverable' && 'Database Corruption Detected'}
              {!isDegraded && stateInfo.state === 'recovering' && 'Recovering...'}
              {!isDegraded && stateInfo.state === 'recovered' && 'Recovery Successful'}
              {!isDegraded && stateInfo.state === 'failed' && 'Recovery Failed'}
            </h3>
            <p className="text-sm mt-1 opacity-90">
              {isDegraded
                ? 'Database is running in-memory. Data will not persist after page refresh. OPFS recovery options available below.'
                : stateInfo.message}
            </p>

            {stateInfo.context?.originalError && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer opacity-75">Technical details</summary>
                <pre className="text-xs mt-1 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto max-h-32">
                  {stateInfo.context.originalError.message}
                </pre>
              </details>
            )}

            {diagnostics && (
              <div className="mt-3 text-xs grid grid-cols-2 gap-2">
                <div>Active DB Read: {diagnostics.canRead ? '✓' : '✕'}</div>
                <div>Active DB Write: {diagnostics.canWrite ? '✓' : '✕'}</div>
                <div>OPFS Supported: {diagnostics.opfsSupported ? '✓' : '✕'}</div>
                <div>OPFS Write: {diagnostics.opfsCanWrite ? '✓' : '✕'}</div>
                <div>DB File Exists: {diagnostics.dbFileExists ? '✓' : '✕'}</div>
                <div>Tables: {diagnostics.tableCount}</div>
                {diagnostics.isInMemoryFallback && (
                  <div className="col-span-2 text-orange-600 dark:text-orange-400 font-medium">
                    ⚠ In-Memory Fallback Active
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {stateInfo.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {stateInfo.actions
                  .sort((a, b) => a.priority - b.priority)
                  .map((action) => (
                    <Button
                      key={action.id}
                      onClick={() => handleAction(action)}
                      disabled={isExecuting}
                      variant={action.destructive ? 'destructive' : 'secondary'}
                      size="sm"
                      title={action.description}
                    >
                      {isExecuting ? '...' : action.label}
                    </Button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Database Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              This will <strong>permanently delete</strong> all database data. This action cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground">
              Consider exporting a backup first if you want to preserve any data.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmReset(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmedReset}
                disabled={isExecuting}
              >
                {isExecuting ? 'Resetting...' : 'Reset Database'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
