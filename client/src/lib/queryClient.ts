import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage: string;
    try {
      // Clone response before reading
      const resClone = res.clone();
      const data = await resClone.json();
      errorMessage = data.error || `${res.status}: ${res.statusText}`;
    } catch (e) {
      // If JSON parsing fails, provide a default error message
      errorMessage = res.status === 401 
        ? 'You must be logged in to perform this action'
        : `${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Ensure we always throw an Error object with a message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      // Handle 401 according to behavior option
      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        const data = await res.json();
        throw new Error(data.error || 'You must be logged in to perform this action');
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});