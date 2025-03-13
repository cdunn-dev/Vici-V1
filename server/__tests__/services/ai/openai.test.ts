import { vi } from 'vitest';

// Mock completion function
const mockCompletionCreate = vi.fn();

// Mock OpenAI module before imports
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
import { AIServiceError } from '../../../services/ai/types';

describe('OpenAI Service', () => {
  let openaiService: OpenAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();

    openaiService = new OpenAIService({
      apiKey: 'test-key',
      modelName: 'gpt-4o',
      provider: 'openai'
    });
  });

  describe('Constructor', () => {
    it('should throw AIServiceError if API key is missing', () => {
      expect(() => new OpenAIService({ 
        apiKey: '', 
        provider: 'openai' 
      })).toThrow(AIServiceError);

      try {
        new OpenAIService({ apiKey: '', provider: 'openai' });
      } catch (error) {
        expect(error instanceof AIServiceError).toBe(true);
        expect(error.message).toBe('OpenAI API key is not configured');
      }
    });
  });

  describe('makeRequest', () => {
    it('should handle invalid JSON responses', async () => {
      mockCompletionCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      });

      try {
        await openaiService['makeRequest']('test prompt', 'test operation', 'json');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect(error.message).toBe('Invalid response from OpenAI API');
      }
    });

    it('should handle empty responses', async () => {
      mockCompletionCreate.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      try {
        await openaiService['makeRequest']('test prompt', 'test operation');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect(error.message).toBe('Invalid response from OpenAI API');
      }
    });

    it('should handle API errors', async () => {
      mockCompletionCreate.mockRejectedValue(new Error('API Error'));

      try {
        await openaiService['makeRequest']('test prompt', 'test operation');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect(error.message).toContain('Failed to make OpenAI API request');
      }
    });
  });

  describe('generateTrainingPlan', () => {
    const mockPreferences = {
      goal: "Complete a marathon",
      goalDescription: "First time marathon",
      startDate: "2025-03-15",
      endDate: new Date("2025-06-15"),
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
      mockCompletionCreate.mockRejectedValue(new Error('Failed to generate plan'));

      try {
        await openaiService.generateTrainingPlan(mockPreferences);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect(error.message).toBe('Failed to generate training plan');
      }
    });

    it('should successfully generate a training plan', async () => {
      const mockResponse = {
        weeklyPlans: [
          {
            week: 1,
            phase: 'Base Building',
            totalMileage: 20,
            workouts: []
          }
        ]
      };

      mockCompletionCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse)
          }
        }]
      });

      const result = await openaiService.generateTrainingPlan(mockPreferences);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('analyzeWorkout', () => {
    const mockWorkout = {
      date: new Date('2025-03-15'),
      type: 'Easy Run',
      distance: 5,
      duration: 30,
      averagePace: 360,
      perceivedEffort: 3
    };

    it('should handle analysis errors', async () => {
      mockCompletionCreate.mockRejectedValue(new Error('Analysis failed'));

      try {
        await openaiService.analyzeWorkout(mockWorkout);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect(error.message).toBe('Failed to analyze workout');
      }
    });

    it('should successfully analyze a workout', async () => {
      const mockAnalysis = {
        feedback: 'Good workout',
        adjustments: 'No changes needed'
      };

      mockCompletionCreate.mockResolvedValue({
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
    const mockFeedback = "Need more recovery time";
    const mockCurrentPlan = {
      weeklyPlans: [{
        week: 1,
        phase: 'Base Building',
        workouts: []
      }]
    };

    it('should handle adjustment errors', async () => {
      mockCompletionCreate.mockRejectedValue(new Error('Adjustment failed'));

      try {
        await openaiService.generateAdjustments(mockFeedback, mockCurrentPlan);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect(error.message).toBe('Failed to generate adjustments');
      }
    });

    it('should successfully generate adjustments', async () => {
      const mockAdjustments = {
        reasoning: 'Adding more rest days',
        suggestedPlan: mockCurrentPlan
      };

      mockCompletionCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAdjustments)
          }
        }]
      });

      const result = await openaiService.generateAdjustments(mockFeedback, mockCurrentPlan);
      expect(result).toEqual(mockAdjustments);
    });
  });
});