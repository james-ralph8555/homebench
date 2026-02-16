/**
 * @fileoverview Non-destructive recovery state machine for database durability
 *
 * This module implements a staged recovery workflow that:
 * 1. Detects corruption/recovery scenarios
 * 2. Guides users through non-destructive recovery options first
 * 3. Only allows destructive reset with explicit user confirmation
 * 4. Never auto-wipes OPFS data
 *
 * States:
 * - healthy: Database is operating normally
 * - detected: Potential issue detected, investigating
 * - recoverable: Non-destructive recovery possible
 * - unrecoverable: Only destructive reset available
 * - recovering: Recovery in progress
 * - recovered: Recovery completed successfully
 * - failed: Recovery failed, user must decide
 */

import { logger } from './logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type RecoveryState =
  | 'healthy'
  | 'detected'
  | 'recoverable'
  | 'unrecoverable'
  | 'recovering'
  | 'recovered'
  | 'failed';

export type RecoveryErrorType =
  | 'wal_conflict'
  | 'write_mode_corrupted'
  | 'checkpoint_failed'
  | 'connection_lost'
  | 'opfs_unavailable'
  | 'unknown';

export interface RecoveryContext {
  errorType: RecoveryErrorType;
  originalError?: Error;
  timestamp: Date;
  attemptCount: number;
  lastAttempt?: Date;
  diagnostics?: RecoveryDiagnostics;
}

export interface RecoveryDiagnostics {
  canRead: boolean;
  canWrite: boolean;
  opfsSupported: boolean;
  dbFileExists: boolean;
  dbFileSize: number | null;
  tableCount: number;
  errorMessage: string;
  isInMemoryFallback: boolean;
  opfsCanRead: boolean;
  opfsCanWrite: boolean;
}

export interface RecoveryStateInfo {
  state: RecoveryState;
  context?: RecoveryContext;
  message: string;
  actions: RecoveryAction[];
  isInMemoryFallback: boolean;
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  destructive: boolean;
  priority: number;
}

export interface StateTransition {
  from: RecoveryState;
  to: RecoveryState;
  condition: (context: RecoveryContext) => boolean;
}

// =============================================================================
// RECOVERY STATE MACHINE
// =============================================================================

const RECOVERY_ACTIONS: Record<RecoveryState, RecoveryAction[]> = {
  healthy: [],
  detected: [
    {
      id: 'diagnose',
      label: 'Run Diagnostics',
      description: 'Analyze the database state to determine recovery options',
      destructive: false,
      priority: 1,
    },
  ],
  recoverable: [
    {
      id: 'attempt_opfs_recovery',
      label: 'Attempt OPFS Recovery',
      description: 'Delete corrupt WAL files and reconnect to OPFS storage',
      destructive: false,
      priority: 1,
    },
    {
      id: 'retry_checkpoint',
      label: 'Retry Checkpoint',
      description: 'Attempt to flush pending writes to disk',
      destructive: false,
      priority: 2,
    },
    {
      id: 'reconnect',
      label: 'Reconnect Database',
      description: 'Close and reopen the database connection',
      destructive: false,
      priority: 3,
    },
    {
      id: 'export_backup',
      label: 'Export Backup',
      description: 'Download current database before attempting recovery',
      destructive: false,
      priority: 4,
    },
  ],
  unrecoverable: [
    {
      id: 'attempt_opfs_recovery',
      label: 'Attempt OPFS Recovery',
      description: 'Delete corrupt WAL files and reconnect to OPFS storage',
      destructive: false,
      priority: 1,
    },
    {
      id: 'export_backup',
      label: 'Export Backup',
      description: 'Download remaining data before reset',
      destructive: false,
      priority: 2,
    },
    {
      id: 'reset_destructive',
      label: 'Reset Database',
      description: 'Delete all data and start fresh (cannot be undone)',
      destructive: true,
      priority: 3,
    },
  ],
  recovering: [],
  recovered: [
    {
      id: 'dismiss',
      label: 'Dismiss',
      description: 'Acknowledge recovery and continue',
      destructive: false,
      priority: 1,
    },
  ],
  failed: [
    {
      id: 'export_backup',
      label: 'Export Backup',
      description: 'Try to download any recoverable data',
      destructive: false,
      priority: 1,
    },
    {
      id: 'retry_recovery',
      label: 'Retry Recovery',
      description: 'Attempt recovery again',
      destructive: false,
      priority: 2,
    },
    {
      id: 'reset_destructive',
      label: 'Reset Database',
      description: 'Delete all data and start fresh (cannot be undone)',
      destructive: true,
      priority: 3,
    },
  ],
};

const STATE_MESSAGES: Record<RecoveryState, string> = {
  healthy: 'Database is operating normally',
  detected: 'Potential database issue detected',
  recoverable: 'Database can be recovered without data loss',
  unrecoverable: 'Database corruption detected. Data reset may be required.',
  recovering: 'Attempting recovery...',
  recovered: 'Database recovered successfully',
  failed: 'Recovery failed. Manual intervention required.',
};

class RecoveryStateMachine {
  private currentState: RecoveryState = 'healthy';
  private context: RecoveryContext | undefined;
  private listeners: Set<(state: RecoveryStateInfo) => void> = new Set();
  private isInMemoryFallback: boolean = false;

  setInMemoryFallback(value: boolean): void {
    this.isInMemoryFallback = value;
    this.notify();
  }

  getInMemoryFallback(): boolean {
    return this.isInMemoryFallback;
  }

  getState(): RecoveryStateInfo {
    return {
      state: this.currentState,
      context: this.context,
      message: STATE_MESSAGES[this.currentState],
      actions: RECOVERY_ACTIONS[this.currentState],
      isInMemoryFallback: this.isInMemoryFallback,
    };
  }

  subscribe(listener: (state: RecoveryStateInfo) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const stateInfo = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(stateInfo);
      } catch (e) {
        logger.warn('Recovery state listener error:', e);
      }
    });
  }

  detectIssue(errorType: RecoveryErrorType, error?: Error): void {
    if (this.currentState !== 'healthy') {
      logger.debug('Recovery already in progress, ignoring new detection');
      return;
    }

    logger.info(`Recovery issue detected: ${errorType}`);

    this.context = {
      errorType,
      originalError: error,
      timestamp: new Date(),
      attemptCount: 0,
    };

    this.transitionTo('detected');
  }

  async runDiagnostics(): Promise<RecoveryDiagnostics> {
    const diagnostics: RecoveryDiagnostics = {
      canRead: false,
      canWrite: false,
      opfsSupported: false,
      dbFileExists: false,
      dbFileSize: null,
      tableCount: 0,
      errorMessage: '',
      isInMemoryFallback: this.isInMemoryFallback,
      opfsCanRead: false,
      opfsCanWrite: false,
    };

    try {
      const { isOpfsSupported } = await import('./duckdbManager');
      diagnostics.opfsSupported = isOpfsSupported();

      if (diagnostics.opfsSupported) {
        const { getDatabaseFileSize } = await import('./opfsUtils');
        diagnostics.dbFileSize = await getDatabaseFileSize();
        diagnostics.dbFileExists = diagnostics.dbFileSize !== null;

        // Attempt to directly test OPFS access (not through the in-memory fallback DB)
        try {
          const opfsRoot = await navigator.storage.getDirectory();
          
          // Test OPFS write access by trying to create a test file
          try {
            const testFile = await opfsRoot.getFileHandle('recovery_test_' + Date.now(), { create: true });
            const writable = await testFile.createWritable();
            await writable.write(new ArrayBuffer(1));
            await writable.close();
            await opfsRoot.removeEntry(testFile.name);
            diagnostics.opfsCanWrite = true;
          } catch (writeErr) {
            logger.debug('OPFS write test failed:', writeErr);
          }

          // Test OPFS read access
          try {
            const dbFile = await opfsRoot.getFileHandle('homebench.db', { create: false });
            const file = await dbFile.getFile();
            if (file.size > 0) {
              diagnostics.opfsCanRead = true;
            }
          } catch (readErr) {
            logger.debug('OPFS read test failed (DB file may not exist):', readErr);
          }
        } catch (opfsErr) {
          logger.debug('OPFS access test failed:', opfsErr);
          diagnostics.errorMessage = opfsErr instanceof Error ? opfsErr.message : String(opfsErr);
        }
      }

      // Check the currently active database (may be in-memory fallback)
      const { DuckDBManager } = await import('./duckdbManager');
      const manager = DuckDBManager.getInstance();

      try {
        await manager.executeQuery('SELECT 1', [], 'ro');
        diagnostics.canRead = true;
      } catch (e) {
        if (!diagnostics.errorMessage) {
          diagnostics.errorMessage = e instanceof Error ? e.message : String(e);
        }
      }

      if (diagnostics.canRead) {
        try {
          const testTable = `recovery_test_${Date.now()}`;
          await manager.executeQuery(`CREATE TEMPORARY TABLE ${testTable} AS SELECT 1`, [], 'rw');
          diagnostics.canWrite = true;
        } catch (e) {
          if (!diagnostics.errorMessage) {
            diagnostics.errorMessage = e instanceof Error ? e.message : String(e);
          }
        }

        try {
          const result = await manager.executeQuery(
            "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'",
            [],
            'ro'
          );
          diagnostics.tableCount = result.toArray()[0]?.cnt || 0;
        } catch {
          // Ignore table count errors
        }
      }
    } catch (e) {
      if (!diagnostics.errorMessage) {
        diagnostics.errorMessage = e instanceof Error ? e.message : String(e);
      }
    }

    if (this.context) {
      this.context.diagnostics = diagnostics;
    }

    return diagnostics;
  }

  async evaluateRecoverability(): Promise<void> {
    if (this.currentState !== 'detected') {
      return;
    }

    const diagnostics = await this.runDiagnostics();

    logger.info('Recovery diagnostics:', diagnostics);

    // CRITICAL: Never claim "recovered" when in in-memory fallback mode
    // In-memory DB always works, but OPFS is still broken
    if (this.isInMemoryFallback) {
      // Check if OPFS itself is recoverable
      if (diagnostics.opfsCanWrite && diagnostics.dbFileExists) {
        this.transitionTo('recoverable');
        return;
      }
      // OPFS is not recoverable, user must decide
      this.transitionTo('unrecoverable');
      return;
    }

    // Normal (non-fallback) flow
    if (diagnostics.canRead && diagnostics.canWrite) {
      this.transitionTo('recovered');
      return;
    }

    if (diagnostics.canRead || diagnostics.dbFileExists) {
      this.transitionTo('recoverable');
      return;
    }

    this.transitionTo('unrecoverable');
  }

  async attemptRecovery(method: 'checkpoint' | 'reconnect' = 'checkpoint'): Promise<boolean> {
    if (this.currentState !== 'recoverable' && this.currentState !== 'failed') {
      logger.warn('Cannot attempt recovery from current state:', this.currentState);
      return false;
    }

    // CRITICAL: Standard recovery (checkpoint/reconnect) cannot fix OPFS when in fallback mode
    // The in-memory DB always works, but OPFS is still broken
    if (this.isInMemoryFallback) {
      logger.warn('Standard recovery unavailable in fallback mode - use attempt_opfs_recovery instead');
      return false;
    }

    this.transitionTo('recovering');

    if (this.context) {
      this.context.attemptCount++;
      this.context.lastAttempt = new Date();
    }

    try {
      const { DuckDBManager } = await import('./duckdbManager');
      const manager = DuckDBManager.getInstance();
      const dbState = await manager.getDatabaseState();

      if (method === 'checkpoint') {
        if (dbState.db) {
          const conn = await dbState.db.connect();
          try {
            await conn.query('CHECKPOINT');
            await dbState.db.flushFiles();
            logger.info('Recovery checkpoint completed');
            this.transitionTo('recovered');
            return true;
          } finally {
            await conn.close();
          }
        }
      }

      if (method === 'reconnect') {
        await manager.reset();
        await manager.getDatabaseState();
        logger.info('Database reconnection completed');

        const healthCheck = await this.runDiagnostics();
        if (healthCheck.canRead && healthCheck.canWrite) {
          this.transitionTo('recovered');
          return true;
        }
      }

      this.transitionTo('failed');
      return false;
    } catch (e) {
      logger.error('Recovery attempt failed:', e);
      if (this.context) {
        this.context.originalError = e instanceof Error ? e : new Error(String(e));
      }
      this.transitionTo('failed');
      return false;
    }
  }

  async executeAction(actionId: string): Promise<{ success: boolean; message: string }> {
    switch (actionId) {
      case 'diagnose':
        await this.evaluateRecoverability();
        return { success: true, message: 'Diagnostics completed' };

      case 'retry_checkpoint':
        if (this.isInMemoryFallback) {
          return {
            success: false,
            message: 'Checkpoint unavailable in fallback mode. Use "Attempt OPFS Recovery" to restore OPFS access.',
          };
        }
        const checkpointResult = await this.attemptRecovery('checkpoint');
        return {
          success: checkpointResult,
          message: checkpointResult ? 'Checkpoint completed successfully' : 'Checkpoint failed',
        };

      case 'reconnect':
        if (this.isInMemoryFallback) {
          return {
            success: false,
            message: 'Reconnect unavailable in fallback mode. Use "Attempt OPFS Recovery" to restore OPFS access.',
          };
        }
        const reconnectResult = await this.attemptRecovery('reconnect');
        return {
          success: reconnectResult,
          message: reconnectResult ? 'Reconnection successful' : 'Reconnection failed',
        };

      case 'export_backup':
        try {
          const { downloadSavedSessionAsDuckDB } = await import('./opfsUtils');
          await downloadSavedSessionAsDuckDB();
          return { success: true, message: 'Backup exported successfully' };
        } catch (e) {
          return {
            success: false,
            message: `Export failed: ${e instanceof Error ? e.message : String(e)}`,
          };
        }

      case 'retry_recovery':
        if (this.isInMemoryFallback) {
          return {
            success: false,
            message: 'Standard recovery unavailable in fallback mode. Use "Attempt OPFS Recovery" to restore OPFS access.',
          };
        }
        await this.evaluateRecoverability();
        if (this.currentState === 'recoverable') {
          const result = await this.attemptRecovery('checkpoint');
          return {
            success: result,
            message: result ? 'Recovery successful' : 'Recovery failed',
          };
        }
        return { success: false, message: 'Recovery not possible' };

      case 'reset_destructive':
        return { success: false, message: 'Destructive reset requires explicit user confirmation via UI' };

      case 'dismiss':
        this.reset();
        return { success: true, message: 'Dismissed' };

      case 'attempt_opfs_recovery':
        try {
          const { DuckDBManager } = await import('./duckdbManager');
          const manager = DuckDBManager.getInstance();
          const opfsResult = await manager.attemptOpfsRecovery();
          if (opfsResult.success) {
            this.isInMemoryFallback = false;
            this.transitionTo('recovered');
          } else {
            this.transitionTo('failed');
          }
          return {
            success: opfsResult.success,
            message: opfsResult.message,
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.error('OPFS recovery action failed:', e);
          return { success: false, message: `OPFS recovery failed: ${message}` };
        }

      default:
        return { success: false, message: `Unknown action: ${actionId}` };
    }
  }

  reset(): void {
    this.currentState = 'healthy';
    this.context = undefined;
    this.isInMemoryFallback = false;
    this.notify();
  }

  private transitionTo(newState: RecoveryState): void {
    const oldState = this.currentState;
    this.currentState = newState;
    logger.info(`Recovery state transition: ${oldState} -> ${newState}`);
    this.notify();
  }
}

// Singleton instance
let recoveryMachine: RecoveryStateMachine | null = null;

export function getRecoveryMachine(): RecoveryStateMachine {
  if (!recoveryMachine) {
    recoveryMachine = new RecoveryStateMachine();
  }
  return recoveryMachine;
}

export function resetRecoveryMachine(): void {
  if (recoveryMachine) {
    recoveryMachine.reset();
  }
}

// =============================================================================
// WAL CONFLICT DETECTION HELPER
// =============================================================================

export function isWalConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes('Table with name') &&
    msg.includes('already exists') &&
    msg.includes('replaying WAL file')
  );
}

export function isWriteModeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return msg.includes('File is not opened in write mode') || msg.includes('TransactionContext');
}

export function classifyError(error: unknown): RecoveryErrorType {
  if (!(error instanceof Error)) return 'unknown';

  if (isWalConflictError(error)) return 'wal_conflict';
  if (isWriteModeError(error)) return 'write_mode_corrupted';
  if (error.message.includes('checkpoint')) return 'checkpoint_failed';
  if (error.message.includes('connection') || error.message.includes('timeout')) {
    return 'connection_lost';
  }
  if (error.message.includes('OPFS') || error.message.includes('storage')) {
    return 'opfs_unavailable';
  }

  return 'unknown';
}
