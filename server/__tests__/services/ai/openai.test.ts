import { vi } from 'vitest';

// Mock completion function
const mockCompletionCreate = vi.fn();

// Mock OpenAI module before other imports
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCompletionCreate
      }
    }
  }))
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIService } from '../../../services/ai/openai';

describe('OpenAI Service', () => {
  let openaiService: OpenAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    openaiService = new OpenAIService({
      apiKey: 'test-key',
      modelName: 'gpt-4o'
    });
  });

  describe('makeRequest', () => {
    it('should handle JSON parsing errors', async () => {
      mockCompletionCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'invalid json'
          }
        }]
      });

      // Service wraps parse errors with specific context
      await expect(openaiService['makeRequest']('test prompt', 'test operation', 'json'))
        .rejects.toThrow('OpenAI API error: Failed to parse response');
    });
  });

  describe('generateTrainingPlan', () => {
    const mockUserPreferences = {
      goal: "Complete a marathon",
      startDate: "2025-03-15",
      endDate: "2025-06-15",
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
      }
    };

    it('should handle generation errors', async () => {
      // Service wraps OpenAI errors with specific context
      mockCompletionCreate.mockRejectedValueOnce(
        new Error('Failed to generate training plan')
      );

      await expect(openaiService.generateTrainingPlan(mockUserPreferences))
        .rejects.toThrow('OpenAI API error: Failed to generate training plan');
    });
  });

  describe('analyzeWorkout', () => {
    const mockWorkout = {
      type: 'Tempo Run',
      distance: 8,
      description: '2 mile warmup, 4 miles at tempo pace, 2 mile cooldown',
      date: new Date('2025-03-15'),
      duration: 60,
      averagePace: 480,
      perceivedEffort: 7
    };

    it('should analyze workout successfully', async () => {
      const mockAnalysis = {
        feedback: 'Good workout structure',
        adjustments: [
          'Consider adding strides during warmup',
          'Try to maintain even splits during tempo portion'
        ],
        riskAssessment: {
          overtrainingRisk: 'low',
          injuryRisk: 'low'
        }
      };

      mockCompletionCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockAnalysis)
          }
        }]
      });

      const result = await openaiService.analyzeWorkout(mockWorkout);
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('generateAdjustments', () => {
    const mockFeedback = 'Need more recovery time';
    const mockCurrentPlan = {
      weeklyPlans: [{
        week: 1,
        phase: 'Base Building',
        workouts: [{
          type: 'Tempo Run',
          distance: 5,
          description: 'Tempo run'
        }]
      }]
    };

    it('should handle adjustment errors', async () => {
      // Service wraps OpenAI errors with specific context
      mockCompletionCreate.mockRejectedValueOnce(
        new Error('Failed to generate adjustments')
      );

      await expect(openaiService.generateAdjustments(mockFeedback, mockCurrentPlan))
        .rejects.toThrow('OpenAI API error: Failed to generate adjustments');
    });
  });
});