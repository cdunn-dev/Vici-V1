import { queryClient } from "./queryClient";

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<Response> {
  const options: RequestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include' // Important for auth cookies
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    // Attempt to parse error response
    const error = await response.json().catch(() => ({
      error: response.status === 401 ? 'Invalid email or password' : `HTTP error! status: ${response.status}`
    }));

    // Use consistent error message format
    const errorMessage = error.error || error.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response;
}

export function invalidateQueries(queryKey: string | string[]) {
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  return queryClient.invalidateQueries({ queryKey: key });
}