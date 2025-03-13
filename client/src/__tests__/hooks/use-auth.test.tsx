import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';
import { createWrapper } from '../test-utils';
import { mockApiResponse, mockApiError } from '../test-utils';
import { vi } from 'vitest';
import { useToast } from '@/hooks/use-toast';

// Mock fetch globally
global.fetch = vi.fn();

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  describe('Login Flow', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should handle successful login', async () => {
      const mockUser = { id: 1, email: validCredentials.email };
      vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.loginMutation.mutateAsync(validCredentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
      expect(useToast().toast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'You have successfully logged in.'
      });
    });

    it('should handle invalid credentials', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        mockApiError(401, 'Invalid email or password combination')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      try {
        await act(async () => {
          await result.current.loginMutation.mutateAsync(validCredentials);
        });
      } catch (error) {
        expect(error.message).toBe('Invalid email or password combination');
      }

      expect(result.current.user).toBeNull();
      expect(useToast().toast).toHaveBeenCalledWith({
        title: 'Login failed',
        description: 'Invalid email or password combination',
        variant: 'destructive'
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      try {
        await act(async () => {
          await result.current.loginMutation.mutateAsync(validCredentials);
        });
      } catch (error) {
        expect(error.message).toBe('Network error');
      }

      expect(result.current.user).toBeNull();
      expect(useToast().toast).toHaveBeenCalledWith({
        title: 'Login failed',
        description: 'Network error',
        variant: 'destructive'
      });
    });
  });

  describe('Authentication Status', () => {
    it('should handle unauthenticated state properly', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        mockApiError(401, 'You must be logged in to perform this action')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle session errors', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        mockApiError(500, 'Session management error')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.user).toBeNull();
    });
  });
});