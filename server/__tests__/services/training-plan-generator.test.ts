import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateTrainingPlan } from '../../services/training-plan-generator';
import { TrainingPlanError, ERROR_MESSAGES } from '../../services/types/training-plan';
import { addWeeks } from 'date-fns';

// Mock AI service
vi.mock('../../services/ai/openai', () => ({
  generateTrainingPlan: vi.fn()
}));

describe('Training Plan Generator Service', () => {
  const validPreferences = {
    goal: "Complete a marathon",
    startDate: new Date().toISOString(),
    endDate: addWeeks(new Date(), 12).toISOString(),
    runningExperience: {
      level: 'intermediate',
      fitnessLevel: 'good'
    },
    trainingPreferences: {
      weeklyRunningDays: 5,
      maxWeeklyMileage: 50,
      weeklyWorkouts: 3,
      preferredLongRunDay: 'sunday',
      coachingStyle: 'moderate'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const invalidPreferences = {
        ...validPreferences,
        goal: '',
      };

      await expect(generateTrainingPlan(invalidPreferences))
        .rejects
        .toThrow(TrainingPlanError);
    });

    it('should validate date ranges', async () => {
      const invalidDatePreferences = {
        ...validPreferences,
        startDate: new Date('2025-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
      };

      await expect(generateTrainingPlan(invalidDatePreferences))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_DATE_RANGE);
    });

    it('should validate running experience levels', async () => {
      const invalidExperience = {
        ...validPreferences,
        runningExperience: {
          level: 'invalid',
          fitnessLevel: 'good'
        }
      };

      await expect(generateTrainingPlan(invalidExperience))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_EXPERIENCE_LEVEL);
    });
  });

  describe('AI Service Integration', () => {
    it('should handle AI service errors gracefully', async () => {
      const mockGenerateAIPlan = vi.fn().mockRejectedValue(
        new Error('AI service unavailable')
      );
      vi.mock('../../services/ai/openai', () => ({
        generateTrainingPlan: mockGenerateAIPlan
      }));

      await expect(generateTrainingPlan(validPreferences))
        .rejects
        .toThrow(ERROR_MESSAGES.AI_SERVICE_UNAVAILABLE);
    });

    it('should validate AI response format', async () => {
      const mockGenerateAIPlan = vi.fn().mockResolvedValue({
        invalidFormat: true
      });
      vi.mock('../../services/ai/openai', () => ({
        generateTrainingPlan: mockGenerateAIPlan
      }));

      await expect(generateTrainingPlan(validPreferences))
        .rejects
        .toThrow(ERROR_MESSAGES.VALIDATION_ERROR);
    });
  });

  describe('Plan Generation', () => {
    it('should generate a plan matching user preferences', async () => {
      const mockPlan = {
        weeklyPlans: [
          {
            week: 1,
            phase: 'Base Building',
            totalMileage: 20,
            workouts: [
              {
                day: new Date().toISOString(),
                type: 'Easy Run',
                distance: 3,
                description: 'Easy-paced run'
              }
            ]
          }
        ]
      };

      vi.mock('../../services/ai/openai', () => ({
        generateTrainingPlan: vi.fn().mockResolvedValue(mockPlan)
      }));

      const result = await generateTrainingPlan(validPreferences);
      expect(result.weeklyPlans[0].phase).toBe('Base Building');
      expect(result.weeklyPlans[0].totalMileage).toBeLessThanOrEqual(
        validPreferences.trainingPreferences.maxWeeklyMileage
      );
    });

    it('should respect max weekly mileage preferences', async () => {
      const lowMileagePreferences = {
        ...validPreferences,
        trainingPreferences: {
          ...validPreferences.trainingPreferences,
          maxWeeklyMileage: 20
        }
      };

      const mockPlan = {
        weeklyPlans: [
          {
            week: 1,
            phase: 'Base Building',
            totalMileage: 15,
            workouts: [
              {
                day: new Date().toISOString(),
                type: 'Easy Run',
                distance: 3,
                description: 'Easy-paced run'
              }
            ]
          }
        ]
      };

      vi.mock('../../services/ai/openai', () => ({
        generateTrainingPlan: vi.fn().mockResolvedValue(mockPlan)
      }));

      const result = await generateTrainingPlan(lowMileagePreferences);
      expect(result.weeklyPlans[0].totalMileage).toBeLessThanOrEqual(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', async () => {
      const minimalPreferences = {
        goal: validPreferences.goal,
        startDate: validPreferences.startDate,
        endDate: validPreferences.endDate,
        runningExperience: validPreferences.runningExperience,
        trainingPreferences: {
          weeklyRunningDays: 3,
          maxWeeklyMileage: 30,
          weeklyWorkouts: 2,
          preferredLongRunDay: 'sunday',
          coachingStyle: 'conservative'
        }
      };

      const mockPlan = {
        weeklyPlans: [
          {
            week: 1,
            phase: 'Base Building',
            totalMileage: 15,
            workouts: []
          }
        ]
      };

      vi.mock('../../services/ai/openai', () => ({
        generateTrainingPlan: vi.fn().mockResolvedValue(mockPlan)
      }));

      const result = await generateTrainingPlan(minimalPreferences);
      expect(result.weeklyPlans).toBeDefined();
    });

    it('should handle very short training durations', async () => {
      const shortDurationPreferences = {
        ...validPreferences,
        endDate: addWeeks(new Date(), 2).toISOString()
      };

      await expect(generateTrainingPlan(shortDurationPreferences))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_DATE_RANGE);
    });
  });
});