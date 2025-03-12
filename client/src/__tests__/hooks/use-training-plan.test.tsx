import { renderHook, act } from '@testing-library/react';
import { useTrainingPlan } from '@/hooks/use-training-plan';
import { createWrapper } from '../test-utils';
import { mockApiResponse, mockApiError } from '../test-utils';
import { validTrainingPlan } from '../fixtures/training-plan';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('useTrainingPlan Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch training plans', async () => {
    const mockPlans = [validTrainingPlan];
    vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse(mockPlans));

    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    // Wait for the query to complete
    await act(async () => {
      await result.current.getPlans();
    });

    expect(result.current.plans).toEqual(mockPlans);
  });

  it('should create a new training plan', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse(validTrainingPlan));

    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.createPlan({
        goal: "Complete Marathon",
        startDate: "2025-03-15",
        endDate: "2025-06-15",
        runningExperience: {
          level: "Intermediate",
          fitnessLevel: "Good"
        },
        trainingPreferences: {
          weeklyRunningDays: 4,
          maxWeeklyMileage: 40,
          weeklyWorkouts: 1,
          preferredLongRunDay: "Sunday",
          coachingStyle: "Moderate"
        }
      });
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle plan creation errors', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => 
      mockApiError(400, 'Invalid plan data')
    );

    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      try {
        await result.current.createPlan({
          goal: "",  // Invalid goal
          startDate: "2025-03-15",
          endDate: "2025-06-15"
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should update training plan progress', async () => {
    const updatedPlan = {
      ...validTrainingPlan,
      weeklyPlans: [{
        ...validTrainingPlan.weeklyPlans[0],
        workouts: [{
          ...validTrainingPlan.weeklyPlans[0].workouts[0],
          completed: true
        }]
      }]
    };

    vi.mocked(fetch).mockImplementationOnce(() => mockApiResponse(updatedPlan));

    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.updateWorkout({
        planId: 1,
        workoutId: 1,
        completed: true
      });
    });

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });
});