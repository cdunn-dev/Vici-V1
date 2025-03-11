import { toast } from "@/hooks/use-toast";

// Custom error type for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Error messages for common scenarios
export const ErrorMessages = {
  UNAUTHORIZED: "You must be logged in to perform this action",
  NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection",
  INVALID_DATE: "Invalid date format provided",
  SERVER_ERROR: "An unexpected error occurred. Please try again later",
  VALIDATION_ERROR: "Please check your input and try again",
} as const;

// Helper to handle API responses
export async function handleAPIResponse(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new APIError(
      data.error || ErrorMessages.SERVER_ERROR,
      response.status,
      data.details
    );
  }
  return response.json();
}

// Helper to show error toast with consistent formatting
export function showErrorToast(error: unknown) {
  console.error('Application error:', error);

  if (error instanceof APIError) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
    return;
  }

  toast({
    title: "Error",
    description: error instanceof Error ? error.message : ErrorMessages.SERVER_ERROR,
    variant: "destructive",
  });
}

// Helper to validate required data
export function validateRequired<T>(data: T | null | undefined, errorMessage: string): T {
  if (data == null) {
    throw new Error(errorMessage);
  }
  return data;
}

// Type guard for checking if an object is an Error
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
