import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  OpenAIService,
  type AIServiceConfig,
  type WorkoutType
} from '../../../services/ai/openai';

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
  default: vi.fn().mockImplementation(() => mockClient),
  OpenAI: vi.fn().mockImplementation(() => mockClient)
}));

describe('OpenAI Service', () => {
  let openaiService: OpenAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    const config: AIServiceConfig = {
      apiKey: 'test-key',
      modelName: 'gpt-4o',
      provider: 'openai'
    };
    openaiService = new OpenAIService(config);
  });

  describe('makeRequest', () => {
    it('should make a request to OpenAI with correct parameters', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ response: 'test response' })
            }
          }
        ]
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await openaiService['makeRequest']('test prompt', 'test operation', 'json');

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: expect.any(String)
          },
          {
            role: 'user',
            content: 'test prompt'
          }
        ],
        response_format: { type: 'json_object' }
      });

      expect(result).toEqual({ response: 'test response' });
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      await expect(openaiService['makeRequest']('test prompt', 'test operation')).rejects.toThrow();
    });
  });

  describe('generateTrainingPlan', () => {
    const mockUserPreferences = {
      goalDescription: 'Run a marathon',
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
      startDate: '2025-03-15',
      endDate: '2025-06-15'
    };

    it('should generate a training plan based on user preferences', async () => {
      const mockPlan = {
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

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockPlan)
            }
          }
        ]
      });

      const result = await openaiService.generateTrainingPlan(mockUserPreferences);

      expect(result).toEqual(mockPlan);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Run a marathon')
            })
          ])
        })
      );
    });
  });

  describe('analyzeWorkout', () => {
    const mockWorkout = {
      type: 'Tempo Run' as WorkoutType,
      distance: 8,
      description: '2 mile warmup, 4 miles at tempo pace, 2 mile cooldown',
      date: new Date('2025-03-15'),
      duration: 60,
      averagePace: '8:00',
      perceivedEffort: 7
    };

    it('should analyze a workout and provide feedback', async () => {
      const mockAnalysis = {
        feedback: 'Good workout structure',
        adjustments: 'Consider adding strides during warmup'
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
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Tempo Run')
            })
          ])
        })
      );
    });
  });

  describe('generateAdjustments', () => {
    const mockFeedback = 'Need more recovery time';
    const mockCurrentPlan = {
      weeklyPlans: [
        {
          week: 1,
          workouts: [
            {
              type: 'Easy Run',
              distance: 5,
              description: 'Easy-paced run'
            }
          ]
        }
      ]
    };

    it('should generate plan adjustments based on feedback', async () => {
      const mockAdjustments = {
        suggestedPlan: {
          weeklyPlans: [
            {
              week: 1,
              workouts: [
                {
                  type: 'Recovery Run',
                  distance: 4,
                  description: 'Very easy recovery run'
                }
              ]
            }
          ]
        },
        reasoning: 'Reduced intensity to allow for better recovery'
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAdjustments)
            }
          }
        ]
      });

      const result = await openaiService.generateAdjustments(mockFeedback, mockCurrentPlan);

      expect(result).toEqual(mockAdjustments);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Need more recovery time')
            })
          ])
        })
      );
    });
  });
});