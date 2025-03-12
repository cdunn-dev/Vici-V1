import { vi } from 'vitest';

// Mock setup must be before other imports
vi.mock('../../services/ai/openai', () => ({
  generateTrainingPlan: vi.fn()
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { generateTrainingPlan } from '../../services/training-plan-generator';
import type { TrainingPlanResponse } from '../../services/ai/types';
import { generateTrainingPlan as mockGenerateAIPlan } from '../../services/ai/openai';

describe('Training Plan Generator Service', () => {
  const mockGenerateTrainingPlan = mockGenerateAIPlan as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserPreferences = {
    name: "Marathon Training Plan",
    goal: "Complete a marathon",
    goalDescription: "First-time marathoner aiming to finish strong",
    startDate: '2025-03-15',
    endDate: '2025-06-15',
    weeklyMileage: 30,
    runningExperience: {
      level: 'intermediate',
      fitnessLevel: 'good'
    },
    trainingPreferences: {
      weeklyRunningDays: 5,
      maxWeeklyMileage: 50,
      weeklyWorkouts: 3,
      preferredLongRunDay: 'Sunday',
      coachingStyle: 'directive'
    },
    targetRace: {
      distance: 'Marathon',
      date: '2025-06-15',
      goalTime: '3:45:00'
    },
    weeklyPlans: [],
    is_active: true
  };

  it('should generate a complete training plan', async () => {
    const mockAIResponse: TrainingPlanResponse = {
      weeklyPlans: [
        {
          week: 1,
          phase: 'Base Building',
          totalMileage: 30,
          workouts: [
            {
              day: '2025-03-15',
              type: 'Easy Run',
              distance: 5,
              description: 'Easy-paced run'
            }
          ]
        }
      ]
    };

    mockGenerateTrainingPlan.mockResolvedValueOnce(mockAIResponse);

    const result = await generateTrainingPlan(mockUserPreferences);

    expect(mockGenerateTrainingPlan).toHaveBeenCalledWith(mockUserPreferences);

    expect(result).toEqual({
      id: 0,
      userId: 0,
      active: true,
      name: mockUserPreferences.name,
      goal: mockUserPreferences.goal,
      startDate: mockUserPreferences.startDate,
      endDate: mockUserPreferences.endDate,
      targetRace: mockUserPreferences.targetRace,
      runningExperience: mockUserPreferences.runningExperience,
      trainingPreferences: mockUserPreferences.trainingPreferences,
      weeklyPlans: [
        {
          week: 1,
          phase: 'Base Building',
          totalMileage: 30,
          workouts: [
            {
              day: '2025-03-15',
              type: 'Easy Run',
              distance: 5,
              description: 'Easy-paced run',
              completed: false
            }
          ]
        }
      ]
    });
  });

  it('should validate user preferences before generating plan', async () => {
    // Prevent the AI generation function from being called
    vi.spyOn(mockGenerateTrainingPlan, 'mockImplementation').mockImplementation(() => {
      throw new Error('AI generation should not be called during validation');
    });

    const invalidPreferences = {
      ...mockUserPreferences,
      goal: undefined,
      startDate: undefined,
      endDate: undefined
    };

    await expect(
      generateTrainingPlan(invalidPreferences)
    ).rejects.toThrow('Training goal is required');

    expect(mockGenerateTrainingPlan).not.toHaveBeenCalled();
  });

  it('should handle AI service errors gracefully', async () => {
    mockGenerateTrainingPlan.mockRejectedValueOnce(new Error('AI service error'));

    await expect(generateTrainingPlan(mockUserPreferences))
      .rejects
      .toThrow('Failed to generate training plan');
  });

  it('should generate appropriate training phases', async () => {
    const mockAIResponse: TrainingPlanResponse = {
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

    mockGenerateTrainingPlan.mockResolvedValueOnce(mockAIResponse);

    const result = await generateTrainingPlan(mockUserPreferences);

    const phases = new Set(result.weeklyPlans.map(week => week.phase));
    expect(phases.has('Base Building')).toBe(true);
    expect(phases.has('Peak Training')).toBe(true);
    expect(phases.has('Taper')).toBe(true);
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

    mockGenerateTrainingPlan.mockResolvedValueOnce(mockAIResponse);

    const result = await generateTrainingPlan(lowMileagePreferences);

    expect(result.weeklyPlans[0].totalMileage).toBeLessThanOrEqual(25);
    expect(result.weeklyPlans[0].workouts[0].distance).toBeLessThanOrEqual(8);
  });
});