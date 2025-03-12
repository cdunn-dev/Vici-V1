import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateTrainingPlan } from '../../services/training-plan-generator';

// Mock OpenAI service
const mockGenerateTrainingPlan = vi.fn();
vi.mock('../../services/ai/openai', () => ({
  generateTrainingPlan: mockGenerateTrainingPlan
}));

describe('Training Plan Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserPreferences = {
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
      preferredLongRunDay: 'Sunday',
      coachingStyle: 'directive'
    },
    targetRace: {
      distance: 'Marathon',
      date: '2025-06-15',
      goalTime: '3:45:00'
    }
  };

  it('should generate a complete training plan', async () => {
    const mockAIResponse = {
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
      goal: mockUserPreferences.goal,
      startDate: mockUserPreferences.startDate,
      endDate: mockUserPreferences.endDate,
      targetRace: mockUserPreferences.targetRace,
      runningExperience: mockUserPreferences.runningExperience,
      trainingPreferences: mockUserPreferences.trainingPreferences,
      weeklyPlans: [{
        week: 1,
        phase: 'Base Building',
        totalMileage: 30,
        workouts: [{
          day: '2025-03-15',
          type: 'Easy Run',
          distance: 5,
          description: 'Easy-paced run',
          completed: false
        }]
      }]
    });
  });

  it('should validate user preferences before generating plan', async () => {
    const invalidPreferences = {
      ...mockUserPreferences,
      goal: ''
    };

    await expect(async () => {
      await generateTrainingPlan(invalidPreferences);
    }).rejects.toThrow('Training goal is required');
  });

  it('should handle AI service errors gracefully', async () => {
    mockGenerateTrainingPlan.mockRejectedValueOnce(new Error('AI service error'));

    await expect(async () => {
      await generateTrainingPlan(mockUserPreferences);
    }).rejects.toThrow('Failed to generate training plan');
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

    mockGenerateTrainingPlan.mockResolvedValueOnce(mockAIResponse);

    const result = await generateTrainingPlan(mockUserPreferences);

    const phases = result.weeklyPlans.map(plan => plan.phase);
    expect(phases).toEqual(expect.arrayContaining(['Base Building', 'Build', 'Peak', 'Taper']));
  });

  it('should adjust workout distances based on user\'s max weekly mileage', async () => {
    const lowMileagePreferences = {
      ...mockUserPreferences,
      trainingPreferences: {
        ...mockUserPreferences.trainingPreferences,
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

    mockGenerateTrainingPlan.mockResolvedValueOnce(mockAIResponse);

    const result = await generateTrainingPlan(lowMileagePreferences);

    // Verify mileage constraints
    expect(result.weeklyPlans[0].totalMileage).toBeLessThanOrEqual(25);
    expect(result.weeklyPlans[0].workouts[0].distance).toBeLessThanOrEqual(8);
  });
});