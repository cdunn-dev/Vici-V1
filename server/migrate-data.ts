import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db';
import { users, trainingPlans, workouts } from '@shared/schema';
import * as bcrypt from 'bcryptjs';
import { logger } from './utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateData() {
  logger.info('Starting data migration...');

  try {
    // Skip migration unless explicitly requested
    if (process.env.RUN_MIGRATION !== 'true') {
      logger.info('Skipping data migration - RUN_MIGRATION not set to true');
      return;
    }

    const dbFilePath = path.join(process.cwd(), 'db.json');

    if (!fs.existsSync(dbFilePath)) {
      logger.info('No file-based data found to migrate.');
      return;
    }

    const data = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));

    if (!db) {
      throw new Error('Database connection not initialized');
    }

    // Migrate users
    if (data.users && Object.keys(data.users).length > 0) {
      logger.info(`Migrating ${Object.keys(data.users).length} users...`);

      for (const userData of Object.values(data.users)) {
        const user = userData as any;

        if (!user.password) {
          user.password = await bcrypt.hash('changeme123', 10);
        }

        try {
          await db.insert(users).values({
            ...user,
            connectedApps: Array.isArray(user.connectedApps) ? user.connectedApps : [],
            stravaTokens: typeof user.stravaTokens === 'object' ? user.stravaTokens : null
          }).onConflictDoUpdate({
            target: users.id,
            set: user
          });
        } catch (error) {
          logger.error(`Error migrating user ${user.id}:`, error);
        }
      }
    }

    // Migrate workouts
    if (data.workouts && Object.keys(data.workouts).length > 0) {
      logger.info(`Migrating ${Object.keys(data.workouts).length} workouts...`);

      for (const workoutData of Object.values(data.workouts)) {
        const workout = workoutData as any;

        try {
          await db.insert(workouts).values({
            ...workout,
            day: new Date(workout.day).toISOString()
          }).onConflictDoUpdate({
            target: workouts.id,
            set: workout
          });
        } catch (error) {
          logger.error(`Error migrating workout ${workout.id}:`, error);
        }
      }
    }

    // Migrate training plans
    if (data.trainingPlans && Object.keys(data.trainingPlans).length > 0) {
      logger.info(`Migrating ${Object.keys(data.trainingPlans).length} training plans...`);

      for (const planData of Object.values(data.trainingPlans)) {
        const plan = planData as any;

        try {
          // Ensure dates are properly formatted
          const formattedPlan = {
            ...plan,
            startDate: new Date(plan.startDate).toISOString(),
            endDate: new Date(plan.endDate).toISOString(),
            weeklyPlans: plan.weeklyPlans.map((wp: any) => ({
              ...wp,
              phase: wp.phase || 'Base',
              workouts: wp.workouts.map((w: any) => ({
                ...w,
                day: new Date(w.day).toISOString()
              }))
            }))
          };

          await db.insert(trainingPlans).values(formattedPlan).onConflictDoUpdate({
            target: trainingPlans.id,
            set: formattedPlan
          });
        } catch (error) {
          logger.error(`Error migrating training plan ${plan.id}:`, error);
        }
      }
    }

    logger.info('Data migration completed successfully!');
  } catch (error) {
    logger.error('Error during data migration:', error);
  }
}

// Only run migration if explicitly requested and in a Node.js environment
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.env.RUN_MIGRATION === 'true') {
  migrateData()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateData };