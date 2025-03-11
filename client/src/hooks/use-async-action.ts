import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Options for configuring the useAsyncAction hook
 * @template T - The type of data returned by the async function
 */
interface UseAsyncActionOptions<T> {
  /** Callback function to execute when the async action succeeds */
  onSuccess?: (data: T) => void;
  /** Callback function to execute when the async action fails */
  onError?: (error: Error) => void;
  /** Message to display in a toast notification on success */
  successMessage?: string;
  /** Message to display in a toast notification on error */
  errorMessage?: string;
}

/**
 * A hook that wraps async operations with loading state, error handling, and toast notifications.
 * Provides a consistent way to handle async operations throughout the application.
 * 
 * @template T - The type of data returned by the async function
 * @param asyncFn - The async function to execute
 * @param options - Configuration options for success/error handling and notifications
 * @returns Object containing:
 *  - execute: Function to trigger the async operation
 *  - isLoading: Boolean indicating if the operation is in progress
 *  - error: Any error that occurred during execution
 *  - reset: Function to reset the error state
 * 
 * @example
 * ```typescript
 * const { execute, isLoading } = useAsyncAction(
 *   async (id: number) => {
 *     const response = await fetch(`/api/data/${id}`);
 *     return response.json();
 *   },
 *   {
 *     successMessage: "Data loaded successfully",
 *     errorMessage: "Failed to load data"
 *   }
 * );
 * ```
 */
export function useAsyncAction<T = void>(
  asyncFn: (...args: any[]) => Promise<T>,
  options: UseAsyncActionOptions<T> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await asyncFn(...args);

        if (options.successMessage) {
          toast({
            title: "Success",
            description: options.successMessage,
          });
        }

        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        toast({
          title: "Error",
          description: options.errorMessage || error.message,
          variant: "destructive",
        });

        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn, options, toast]
  );

  return {
    execute,
    isLoading,
    error,
    reset: () => setError(null),
  };
}