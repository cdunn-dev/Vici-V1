
import * as fs from 'fs';
import * as path from 'path';
import { db } from './db';
import { users, trainingPlans, workouts } from '@shared/schema';
import * as bcrypt from 'bcryptjs';

async function migrateData() {
  console.log('Starting data migration...');
  
  try {
    const dbFilePath = path.join(process.cwd(), 'db.json');
    
    if (!fs.existsSync(dbFilePath)) {
      console.log('No file-based data found to migrate.');
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    
    // Migrate users
    if (data.users && Object.keys(data.users).length > 0) {
      console.log(`Migrating ${Object.keys(data.users).length} users...`);
      
      for (const userData of Object.values(data.users)) {
        const user = userData as any;
        
        // Generate a default password for existing users
        if (!user.password) {
          user.password = await bcrypt.hash('changeme123', 10);
        }
        
        try {
          await db.insert(users).values(user).onConflictDoUpdate({
            target: users.id,
            set: user
          });
        } catch (error) {
          console.error(`Error migrating user ${user.id}:`, error);
        }
      }
    }
    
    // Migrate workouts
    if (data.workouts && Object.keys(data.workouts).length > 0) {
      console.log(`Migrating ${Object.keys(data.workouts).length} workouts...`);
      
      for (const workoutData of Object.values(data.workouts)) {
        const workout = workoutData as any;
        
        try {
          await db.insert(workouts).values(workout).onConflictDoUpdate({
            target: workouts.id,
            set: workout
          });
        } catch (error) {
          console.error(`Error migrating workout ${workout.id}:`, error);
        }
      }
    }
    
    // Migrate training plans
    if (data.trainingPlans && Object.keys(data.trainingPlans).length > 0) {
      console.log(`Migrating ${Object.keys(data.trainingPlans).length} training plans...`);
      
      for (const planData of Object.values(data.trainingPlans)) {
        const plan = planData as any;
        
        try {
          await db.insert(trainingPlans).values(plan).onConflictDoUpdate({
            target: trainingPlans.id,
            set: plan
          });
        } catch (error) {
          console.error(`Error migrating training plan ${plan.id}:`, error);
        }
      }
    }
    
    console.log('Data migration completed successfully!');
  } catch (error) {
    console.error('Error during data migration:', error);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateData };
