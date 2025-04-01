import { db } from '../db';
import { trainingPlans, workouts, workoutTemplates, runnerProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface TrainingPlanInput {
  userId: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: '5k' | '10k' | 'half' | 'full' | 'custom';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  duration: number;
  distance: number;
  instructions: string;
}

export class TrainingPlanService {
  async generatePlan(input: TrainingPlanInput): Promise<string> {
    // Get runner profile
    const profile = await db.query.runnerProfiles.findFirst({
      where: eq(runnerProfiles.userId, input.userId)
    });

    if (!profile) {
      throw new Error('Runner profile not found');
    }

    // Create training plan
    const [plan] = await db.insert(trainingPlans).values({
      userId: input.userId,
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type,
      difficulty: input.difficulty,
      status: 'draft'
    }).returning();

    // Get appropriate workout templates based on difficulty and type
    const templates = await db.query.workoutTemplates.findMany({
      where: eq(workoutTemplates.difficulty, input.difficulty)
    });

    // Generate workout schedule
    await this.generateWorkoutSchedule(plan.id, input.startDate, input.endDate, templates);

    return plan.id;
  }

  private async generateWorkoutSchedule(
    planId: string,
    startDate: Date,
    endDate: Date,
    templates: WorkoutTemplate[]
  ): Promise<void> {
    // Calculate number of weeks
    const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Generate weekly schedule
    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week * 7));

      // Generate 3-4 workouts per week
      const workoutsPerWeek = Math.floor(Math.random() * 2) + 3; // 3 or 4 workouts

      for (let day = 0; day < workoutsPerWeek; day++) {
        const workoutDate = new Date(weekStart);
        workoutDate.setDate(workoutDate.getDate() + day);

        // Select random template
        const template = templates[Math.floor(Math.random() * templates.length)];

        // Create workout
        await db.insert(workouts).values({
          planId,
          templateId: template.id,
          scheduledDate: workoutDate,
          status: 'scheduled'
        });
      }
    }
  }

  async getPlan(planId: string) {
    const plan = await db.query.trainingPlans.findFirst({
      where: eq(trainingPlans.id, planId),
      with: {
        workouts: {
          with: {
            template: true
          }
        }
      }
    });

    if (!plan) {
      throw new Error('Training plan not found');
    }

    return plan;
  }

  async updatePlanStatus(planId: string, status: 'draft' | 'active' | 'completed') {
    const [plan] = await db.update(trainingPlans)
      .set({ status })
      .where(eq(trainingPlans.id, planId))
      .returning();

    if (!plan) {
      throw new Error('Training plan not found');
    }

    return plan;
  }
} 