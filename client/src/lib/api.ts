import { queryClient } from "./queryClient";

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

interface GetQueryFnOptions {
  on401: "throw" | "returnNull";
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

export async function getQueryFn<T = any>({ on401 = "throw" }: GetQueryFnOptions = { on401: "throw" }) {
  return async (endpoint: string): Promise<T> => {
    try {
      const response = await fetch(endpoint, {
        credentials: 'include'
      });

      if (response.status === 401) {
        if (on401 === "returnNull") {
          return null as T;
        }
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`
        }));
        throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  };
}

export function invalidateQueries(queryKey: string | string[]) {
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  return queryClient.invalidateQueries({ queryKey: key });
}