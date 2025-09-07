import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DatabaseError, ToErrorMessageFn } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts unknown error types to consistent string messages
 * Handles Error objects, DatabaseError objects, and plain strings/objects
 */
export const toErrorMessage: ToErrorMessageFn = (error: unknown): string => {
  if (error === null || error === undefined) {
    return 'Unknown error occurred';
  }

  // Handle Error instances (including DatabaseError)
  if (error instanceof Error) {
    // If it's a DatabaseError with additional context, include it
    if ('code' in error || 'sqlState' in error) {
      const dbError = error as DatabaseError;
      let message = error.message;
      
      if (dbError.code) {
        message += ` (Code: ${dbError.code})`;
      }
      
      if (dbError.detail && dbError.detail !== error.message) {
        message += ` - ${dbError.detail}`;
      }
      
      return message;
    }
    
    return error.message || 'An error occurred';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with message property
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    
    // Try to stringify object errors
    try {
      return JSON.stringify(error);
    } catch {
      return '[Complex error object]';
    }
  }

  // Fallback for primitive types
  return String(error);
}

