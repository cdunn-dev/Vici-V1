import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

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
