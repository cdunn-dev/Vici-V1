import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OpenAI } from 'openai';
import {
  makeRequest,
  generateTrainingPlan,
  analyzeWorkout,
  generateAdjustments
} from '../../../services/ai/openai';

// Mock OpenAI client
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

describe('OpenAI Service', () => {
  let openai: OpenAI;

  beforeEach(() => {
    vi.clearAllMocks();
    openai = new OpenAI({ apiKey: 'test-key' });
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

      (openai.chat.completions.create as unknown as vi.Mock).mockResolvedValueOnce(mockResponse);

      const result = await makeRequest('test prompt', {
        responseFormat: 'json',
        temperature: 0.7
      });

      expect(openai.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: 'user', content: 'test prompt' }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      expect(result).toEqual({ response: 'test response' });
    });

    it('should handle API errors gracefully', async () => {
      (openai.chat.completions.create as unknown as vi.Mock).mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(makeRequest('test prompt')).rejects.toThrow('Failed to get AI response');
    });
  });

  describe('generateTrainingPlan', () => {
    const mockUserPreferences = {
      goal: 'Run a marathon',
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

      (openai.chat.completions.create as unknown as vi.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockPlan)
            }
          }
        ]
      });

      const result = await generateTrainingPlan(mockUserPreferences);

      expect(result).toEqual(mockPlan);
      expect(openai.chat.completions.create).toHaveBeenCalledWith(
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
      type: 'Tempo Run',
      distance: 8,
      description: '2 mile warmup, 4 miles at tempo pace, 2 mile cooldown'
    };

    it('should analyze a workout and provide feedback', async () => {
      const mockAnalysis = {
        feedback: 'Good workout structure',
        adjustments: 'Consider adding strides during warmup'
      };

      (openai.chat.completions.create as unknown as vi.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis)
            }
          }
        ]
      });

      const result = await analyzeWorkout(mockWorkout);

      expect(result).toEqual(mockAnalysis);
      expect(openai.chat.completions.create).toHaveBeenCalledWith(
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

    const mockFeedback = 'Need more recovery time';

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

      (openai.chat.completions.create as unknown as vi.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAdjustments)
            }
          }
        ]
      });

      const result = await generateAdjustments(mockCurrentPlan, mockFeedback);

      expect(result).toEqual(mockAdjustments);
      expect(openai.chat.completions.create).toHaveBeenCalledWith(
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