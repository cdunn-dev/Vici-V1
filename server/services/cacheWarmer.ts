import { RedisService } from './redis';
import { storage } from '../storage';
import { logger } from '../utils/logger';

export class CacheWarmer {
  private static instance: CacheWarmer;
  private redis: RedisService;
  private isWarming: boolean = false;

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  public static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  public async warmCache(): Promise<void> {
    if (this.isWarming) {
      logger.info('Cache warming already in progress');
      return;
    }

    this.isWarming = true;
    logger.info('Starting cache warming...');

    try {
      await Promise.all([
        this.warmUserCache(),
        this.warmTrainingPlansCache(),
        this.warmWorkoutNotesCache()
      ]);

      logger.info('Cache warming completed successfully');
    } catch (error) {
      logger.error('Error during cache warming:', error);
    } finally {
      this.isWarming = false;
    }
  }

  private async warmUserCache(): Promise<void> {
    try {
      // Get all users and cache them
      const users = await storage.getAllUsers();
      for (const user of users) {
        await this.redis.set(`user:email:${user.email}`, JSON.stringify(user));
      }
      logger.info(`Cached ${users.length} users`);
    } catch (error) {
      logger.error('Error warming user cache:', error);
    }
  }

  private async warmTrainingPlansCache(): Promise<void> {
    try {
      // Get all training plans and cache them
      const plans = await storage.getAllTrainingPlans();
      for (const plan of plans) {
        await this.redis.set(`trainingPlan:${plan.id}`, JSON.stringify(plan));
        // Also cache user's training plans list
        if (plan.userId !== null) {
          const userPlans = await storage.getTrainingPlans(plan.userId);
          await this.redis.set(`trainingPlans:user:${plan.userId}:all`, JSON.stringify(userPlans));
        }
      }
      logger.info(`Cached ${plans.length} training plans`);
    } catch (error) {
      logger.error('Error warming training plans cache:', error);
    }
  }

  private async warmWorkoutNotesCache(): Promise<void> {
    try {
      // Get all workout notes and cache them
      const notes = await storage.getAllWorkoutNotes();
      for (const note of notes) {
        await this.redis.set(`workoutNote:${note.id}`, JSON.stringify(note));
        // Also cache user's workout notes list
        const userNotes = await storage.getWorkoutNotes(note.userId);
        await this.redis.set(`workoutNotes:user:${note.userId}:all`, JSON.stringify(userNotes));
      }
      logger.info(`Cached ${notes.length} workout notes`);
    } catch (error) {
      logger.error('Error warming workout notes cache:', error);
    }
  }
} 