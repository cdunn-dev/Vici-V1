import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateTrainingPlan } from '../../services/training-plan-generator';
import type { TrainingPlanGeneratorInput } from '@shared/schema';
import * as openai from '../../services/ai/openai';
import { type DatabaseStorage } from '../../storage';

// Mock OpenAI service
vi.mock('../../services/ai/openai', () => ({
  generateTrainingPlan: vi.fn(),
  analyzeWorkout: vi.fn(),
  generateAdjustments: vi.fn()
}));

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    createTrainingPlan: vi.fn(),
    updateTrainingPlan: vi.fn(),
    getTrainingPlan: vi.fn()
  } as Partial<DatabaseStorage>
}));

describe('Training Plan Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserPreferences: TrainingPlanGeneratorInput = {
    startDate: '2025-03-15',
    endDate: '2025-06-15',
    goal: 'Complete a marathon',
    runningExperience: {
      level: 'intermediate',
      fitnessLevel: 'good'
    },
    trainingPreferences: {
      weeklyRunningDays: 5,
      maxWeeklyMileage: 50,
      weeklyWorkouts: 3,
      preferredLongRunDay: 'Sunday'
    },
    targetRace: {
      distance: 'Marathon',
      date: '2025-09-15',
      goalTime: '3:45:00'
    }
  };

  it('should generate a complete training plan', async () => {
    const mockPlan = {
      weeklyPlans: [
        {
          week: 1,
          phase: 'Base Building',
          totalMileage: 40,
          workouts: [
            {
              day: '2025-03-15',
              type: 'Long Run',
              distance: 12,
              description: 'Easy-paced long run'
            }
          ]
        }
      ]
    };

    (openai.generateTrainingPlan as vi.Mock).mockResolvedValueOnce(mockPlan);

    const result = await generateTrainingPlan(mockUserPreferences);

    expect(result).toEqual(expect.objectContaining({
      weeklyPlans: expect.arrayContaining([
        expect.objectContaining({
          week: 1,
          phase: 'Base Building'
        })
      ])
    }));

    expect(openai.generateTrainingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: 'Complete a marathon',
        runningExperience: expect.any(Object)
      })
    );
  });

  it('should validate user preferences before generating plan', async () => {
    const invalidPreferences = {
      ...mockUserPreferences,
      goal: ''
    };

    await expect(() => generateTrainingPlan(invalidPreferences))
      .rejects
      .toThrow('Training goal is required');
  });

  it('should handle AI service errors gracefully', async () => {
    (openai.generateTrainingPlan as vi.Mock).mockRejectedValueOnce(
      new Error('AI service error')
    );

    await expect(() => generateTrainingPlan(mockUserPreferences))
      .rejects
      .toThrow('Failed to generate training plan');
  });

  it('should generate appropriate training phases', async () => {
    const mockMarathonPlan = {
      weeklyPlans: [
        { 
          week: 1,
          phase: 'Base Building',
          totalMileage: 30,
          workouts: []
        },
        { 
          week: 4,
          phase: 'Build',
          totalMileage: 35,
          workouts: []
        },
        { 
          week: 8,
          phase: 'Peak',
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

    (openai.generateTrainingPlan as vi.Mock).mockResolvedValueOnce(mockMarathonPlan);

    const result = await generateTrainingPlan(mockUserPreferences);

    const phases = result.weeklyPlans.map(plan => plan.phase);
    expect(phases).toContain('Base Building');
    expect(phases).toContain('Build');
    expect(phases).toContain('Peak');
    expect(phases).toContain('Taper');
  });

  it('should adjust workout distances based on user\'s max weekly mileage', async () => {
    const lowMileagePreferences = {
      ...mockUserPreferences,
      trainingPreferences: {
        ...mockUserPreferences.trainingPreferences,
        maxWeeklyMileage: 25
      }
    };

    const mockLowMileagePlan = {
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

    (openai.generateTrainingPlan as vi.Mock).mockResolvedValueOnce(mockLowMileagePlan);

    const result = await generateTrainingPlan(lowMileagePreferences);

    expect(result.weeklyPlans[0].totalMileage).toBeLessThanOrEqual(25);
    expect(result.weeklyPlans[0].workouts[0].distance).toBeLessThanOrEqual(8);
  });
});