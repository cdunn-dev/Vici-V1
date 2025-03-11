import { renderHook, act } from '@testing-library/react';
import { useTrainingPlan } from '@/hooks/use-training-plan';
import { createAuthWrapper, mockApiResponse, mockApiError } from './test-utils';
import {
  validTrainingPlan,
  planWithEmptyGoal,
  planWithWhitespaceGoal,
  planWithInvalidDates,
  planWithInvalidWorkouts,
  planWithEmptyWorkoutDescription
} from './fixtures/training-plan';
import { vi } from 'vitest';

describe('useTrainingPlan', () => {
  const mockUser = { id: 1, email: 'test@example.com' };

  beforeEach(() => {
    // Reset fetch mock and console
    global.fetch = vi.fn();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Plan Creation and Preview', () => {
    it('updates preview state after successful plan creation', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        mockApiResponse({ ...validTrainingPlan, id: 1 })
      );

      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      // Initial state check
      expect(result.current.previewPlan).toBeNull();
      expect(result.current.showPreview).toBeFalsy();

      // Create plan
      await act(async () => {
        await result.current.createPlan(validTrainingPlan);
      });

      // Check that preview state is updated
      expect(result.current.previewPlan).toEqual(expect.objectContaining({
        id: 1,
        goal: validTrainingPlan.goal
      }));
      expect(result.current.showPreview).toBeTruthy();
    });

    it('handles creation errors and updates state accordingly', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        mockApiError(500, 'Failed to generate plan')
      );

      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      // Initial state check
      expect(result.current.isCreating).toBeFalsy();

      // Attempt to create plan
      await act(async () => {
        try {
          await result.current.createPlan(validTrainingPlan);
        } catch (error) {
          // Error expected
        }
      });

      // Check error state
      expect(result.current.isCreating).toBeFalsy();
      expect(result.current.previewPlan).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('properly manages loading state during plan creation', async () => {
      let resolvePromise: (value: any) => void;
      const mockResponse = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockImplementation(() => mockResponse);

      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      // Start plan creation
      const createPromise = act(async () => {
        result.current.createPlan(validTrainingPlan);
      });

      // Check loading state
      expect(result.current.isCreating).toBeTruthy();

      // Resolve the API call
      await act(async () => {
        resolvePromise!({ ok: true, json: () => ({ ...validTrainingPlan, id: 1 }) });
      });

      await createPromise;

      // Check final state
      expect(result.current.isCreating).toBeFalsy();
    });
  });

  describe('Plan Creation', () => {
    it('validates plan data before making API request', async () => {
      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      // Test empty goal
      await act(async () => {
        try {
          await result.current.createPlan(planWithEmptyGoal);
        } catch (error) {
          expect(error.message).toBe("Training goal is required and cannot be empty");
        }
      });

      // Test whitespace goal
      await act(async () => {
        try {
          await result.current.createPlan(planWithWhitespaceGoal);
        } catch (error) {
          expect(error.message).toBe("Training goal is required and cannot be empty");
        }
      });

      // Verify no API calls were made
      expect(fetch).not.toHaveBeenCalled();
    });

    it('logs plan data before validation', async () => {
      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      await act(async () => {
        try {
          await result.current.createPlan(validTrainingPlan);
        } catch (error) {
          // Ignore errors, we just want to check logging
        }
      });

      expect(console.log).toHaveBeenCalledWith(
        'Creating plan with data:',
        expect.objectContaining({
          goal: validTrainingPlan.goal,
          goalLength: validTrainingPlan.goal.length,
        })
      );
    });

    it('validates dates in plan data', async () => {
      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      await act(async () => {
        try {
          await result.current.createPlan(planWithInvalidDates);
        } catch (error) {
          expect(error.message).toContain("Invalid start date format");
        }
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('validates workout data', async () => {
      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      // Test invalid workout dates
      await act(async () => {
        try {
          await result.current.createPlan(planWithInvalidWorkouts);
        } catch (error) {
          expect(error.message).toContain("Invalid date format for workout");
        }
      });

      // Test empty workout descriptions
      await act(async () => {
        try {
          await result.current.createPlan(planWithEmptyWorkoutDescription);
        } catch (error) {
          expect(error.message).toContain("missing a description");
        }
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('successfully creates a valid plan', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        mockApiResponse({ ...validTrainingPlan, id: 1 })
      );

      const { result } = renderHook(() => useTrainingPlan(), {
        wrapper: createAuthWrapper(mockUser)
      });

      await act(async () => {
        await result.current.createPlan(validTrainingPlan);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/training-plans/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      const sentData = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(sentData.goal).toBe(validTrainingPlan.goal);
    });
  });
});