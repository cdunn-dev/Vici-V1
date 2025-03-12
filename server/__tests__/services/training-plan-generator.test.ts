import { vi } from 'vitest';

// Mock OpenAI module before other imports
vi.mock('../../services/ai/openai', () => ({
  generateTrainingPlan: vi.fn()
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { generateTrainingPlan } from '../../services/training-plan-generator';
import { generateTrainingPlan as mockGenerateAIPlan } from '../../services/ai/openai';
import type { TrainingPlanResponse } from '../../services/ai/types';

describe('Training Plan Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserPreferences = {
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
      ...mockUserPreferences,
      goal: undefined
    };

    await expect(() => generateTrainingPlan(invalidPreferences))
      .rejects
      .toThrow('Training goal is required');

    expect(mockGenerateAIPlan).not.toHaveBeenCalled();
  });

  it('should handle AI service errors gracefully', async () => {
    const aiError = new Error('Failed to generate training plan');
    vi.mocked(mockGenerateAIPlan).mockRejectedValueOnce(aiError);

    await expect(() => generateTrainingPlan(mockUserPreferences))
      .rejects
      .toThrow('Failed to generate training plan');
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

    const result = await generateTrainingPlan(mockUserPreferences);

    expect(result.weeklyPlans.map(week => week.phase))
      .toEqual(['Base Building', 'Base Building', 'Peak Training', 'Taper']);
  });

  it('should adjust workout distances based on max weekly mileage', async () => {
    const lowMileagePreferences = {
      ...mockUserPreferences,
      trainingPreferences: {
        ...mockUserPreferences.trainingPreferences,
        maxWeeklyMileage: 25
      }
    };

    const mockAIResponse: TrainingPlanResponse = {
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