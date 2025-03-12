import { vi } from 'vitest';

// Mock OpenAI module before other imports
vi.mock('../../services/ai/openai', () => ({
  generateTrainingPlan: vi.fn()
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateTrainingPlan } from '../../services/training-plan-generator';
import { generateTrainingPlan as mockGenerateAIPlan } from '../../services/ai/openai';

describe('Training Plan Generator Service', () => {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    vi.clearAllMocks();
    // Silence console during tests
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    // Restore console after tests
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  const validPreferences = {
    goal: "Complete a marathon",
    goalDescription: "First-time marathoner aiming to finish strong",
    startDate: '2025-03-15',
    endDate: '2025-06-15',
    runningExperience: {
      level: 'intermediate',
      fitnessLevel: 'good'
    },
    trainingPreferences: {
      weeklyRunningDays: 5,
      maxWeeklyMileage: 50,
      weeklyWorkouts: 3,
      preferredLongRunDay: 'Sunday',
      coachingStyle: 'Moderate'
    },
    targetRace: {
      distance: 'Marathon',
      date: '2025-06-15',
      goalTime: '3:45:00'
    }
  };

  it('should validate user preferences before generating plan', async () => {
    const invalidPreferences = {
      ...validPreferences,
      goal: ''  // Empty string should trigger validation
    };

    // Log for debugging
    console.log('Testing validation with preferences:', JSON.stringify(invalidPreferences, null, 2));

    // Test validation error
    const promise = generateTrainingPlan(invalidPreferences);
    await expect(promise).rejects.toThrow('Training goal is required');
    expect(mockGenerateAIPlan).not.toHaveBeenCalled();
  });

  it('should handle AI service errors gracefully', async () => {
    const errorMessage = 'Failed to generate training plan';
    vi.mocked(mockGenerateAIPlan).mockRejectedValueOnce(new Error(errorMessage));

    const promise = generateTrainingPlan(validPreferences);
    await expect(promise).rejects.toThrow(errorMessage);
  });

  it('should generate appropriate training phases', async () => {
    const mockAIResponse = {
      weeklyPlans: [
        {
          week: 1,
          phase: 'Base Building',
          totalMileage: 30,
          workouts: []
        },
        {
          week: 4,
          phase: 'Base Building',
          totalMileage: 35,
          workouts: []
        },
        {
          week: 8,
          phase: 'Peak Training',
          totalMileage: 45,
          workouts: []
        },
        {
          week: 12,
          phase: 'Taper',
          totalMileage: 25,
          workouts: []
        }
      ]
    };

    vi.mocked(mockGenerateAIPlan).mockResolvedValueOnce(mockAIResponse);
    const result = await generateTrainingPlan(validPreferences);

    // Verify phases are in the expected order
    expect(result.weeklyPlans.map(week => week.phase))
      .toEqual(['Base Building', 'Base Building', 'Peak Training', 'Taper']);
  });

  it('should adjust workout distances based on max weekly mileage', async () => {
    const lowMileagePreferences = {
      ...validPreferences,
      trainingPreferences: {
        ...validPreferences.trainingPreferences,
        maxWeeklyMileage: 25
      }
    };

    const mockAIResponse = {
      weeklyPlans: [
        {
          week: 1,
          phase: 'Base Building',
          totalMileage: 20,
          workouts: [
            {
              day: '2025-03-15',
              type: 'Long Run',
              distance: 6,
              description: 'Easy-paced long run'
            }
          ]
        }
      ]
    };

    vi.mocked(mockGenerateAIPlan).mockResolvedValueOnce(mockAIResponse);
    const result = await generateTrainingPlan(lowMileagePreferences);

    expect(result.weeklyPlans[0].totalMileage).toBeLessThanOrEqual(25);
    expect(result.weeklyPlans[0].workouts[0].distance).toBeLessThanOrEqual(8);
  });
});