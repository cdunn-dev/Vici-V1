import { renderHook, act } from '@testing-library/react';
import { useTrainingPlan } from '@/hooks/use-training-plan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorMessages } from '@/lib/error-utils';
import { vi } from 'vitest';

// Create a wrapper component that provides the QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockValidPlan = {
  name: "Test Plan",
  goal: "Complete Marathon",
  startDate: "2025-03-15",
  endDate: "2025-06-15",
  weeklyMileage: 30,
  weeklyPlans: [{
    week: 1,
    phase: "Base",
    totalMileage: 20,
    workouts: [{
      day: "2025-03-15",
      type: "Easy Run",
      distance: 5,
      description: "Easy 5 mile run",
      completed: false
    }]
  }],
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
  },
  is_active: true
};

describe('useTrainingPlan', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn();
    console.error = vi.fn();
  });

  it('validates plan goal before creation', async () => {
    const invalidPlan = {
      ...mockValidPlan,
      goal: ''
    };

    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      try {
        result.current.createPlan(invalidPlan);
      } catch (error) {
        expect(error.message).toBe("Training goal is required and cannot be empty");
      }
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates plan data before making API request', async () => {
    const invalidPlan = {
      ...mockValidPlan,
      weeklyPlans: []
    };

    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      try {
        result.current.createPlan(invalidPlan);
      } catch (error) {
        expect(error.message).toBe("Weekly plans are required and must contain at least one week");
      }
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('logs plan data before validation', async () => {
    const { result } = renderHook(() => useTrainingPlan(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      result.current.createPlan(mockValidPlan);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Creating training plan:',
      expect.any(String)
    );
  });
});
