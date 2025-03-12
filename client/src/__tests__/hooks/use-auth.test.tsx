import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';
import { createWrapper } from '../test-utils';
import { mockApiResponse, mockApiError } from '../test-utils';
import { vi } from 'vitest';
import { useToast } from '@/hooks/use-toast';

// Mock fetch globally
global.fetch = vi.fn();

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful login', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.loginMutation.mutateAsync({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('should handle login errors', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => 
      mockApiError(401, 'Invalid credentials')
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      try {
        await result.current.loginMutation.mutateAsync({
          email: 'wrong@example.com',
          password: 'wrongpass'
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loginMutation.error).toBeTruthy();
  });

  it('should handle logout', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse({}));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logoutMutation.mutateAsync();
    });

    expect(result.current.user).toBeNull();
  });

  it('should handle registration', async () => {
    const mockUser = { id: 1, email: 'new@example.com' };
    vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.registerMutation.mutateAsync({
        email: 'new@example.com',
        password: 'newpass123',
        confirmPassword: 'newpass123'
      });
    });

    expect(result.current.user).toEqual(mockUser);
  });
});