import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock OpenAI client
const mockCreate = vi.fn();
const mockClient = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => mockClient)
}));

import { OpenAIService } from '../../../services/ai/openai';

describe('OpenAI Service', () => {
  let openaiService: OpenAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    openaiService = new OpenAIService({
      apiKey: 'test-key',
      modelName: 'gpt-4o',
      provider: 'openai'
    });
  });

  describe('makeRequest', () => {
    it('should handle invalid JSON responses', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json'
            }
          }
        ]
      });

      await expect(() => openaiService['makeRequest']('test prompt', 'test operation', 'json'))
        .rejects
        .toThrow('Failed to parse AI response');
    });
  });

  describe('generateTrainingPlan', () => {
    const mockUserPreferences = {
      goal: "Run a marathon",
      goalDescription: "First-time marathoner aiming to finish",
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
      }
    };

    it('should handle invalid plan generation response', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Invalid training plan generated'));

      await expect(() => openaiService.generateTrainingPlan(mockUserPreferences))
        .rejects.toThrow('Invalid training plan generated');
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

    it('should analyze a workout and provide feedback', async () => {
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

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis)
            }
          }
        ]
      });

      const result = await openaiService.analyzeWorkout(mockWorkout);
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('generateAdjustments', () => {
    const mockFeedback = 'Need more recovery time between hard workouts';
    const mockCurrentPlan = {
      weeklyPlans: [
        {
          week: 1,
          workouts: [
            {
              type: 'Tempo Run',
              distance: 5,
              description: 'Tempo run'
            }
          ]
        }
      ]
    };

    it('should handle invalid adjustment response', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Invalid plan adjustments generated'));

      await expect(() => openaiService.generateAdjustments(mockFeedback, mockCurrentPlan))
        .rejects
        .toThrow('Invalid plan adjustments generated');
    });
  });
});