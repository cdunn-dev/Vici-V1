import React, { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/hooks/use-auth';
import { ToastProvider } from '@/components/ui/toast';
import { vi } from 'vitest';

// Create a wrapper with QueryClient for testing hooks and components
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

// Wrapper component that provides necessary context providers
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

// Wrapper that includes auth context
export function createAuthWrapper(mockUser = null) {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider
          value={{
            user: mockUser,
            isLoading: false,
            error: null,
            loginMutation: { mutate: vi.fn(), isPending: false } as any,
            logoutMutation: { mutate: vi.fn(), isPending: false } as any,
            registerMutation: { mutate: vi.fn(), isPending: false } as any,
          }}
        >
          {children}
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

// Helper to render with all providers
export function renderWithProviders(
  ui: ReactElement,
  { user = null, ...options } = {}
) {
  return render(ui, {
    wrapper: createAuthWrapper(user),
    ...options,
  });
}

// Mock API response helper
export const mockApiResponse = (data: any) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
};

// Mock API error helper
export const mockApiError = (status: number, message: string) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  } as Response);
};