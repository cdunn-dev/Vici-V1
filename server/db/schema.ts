import { pgTable, serial, text, boolean, timestamp, integer, jsonb, decimal, uuid, PgTableWithColumns } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Common fields for all tables
const commonFields = {
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  deletedBy: integer('deleted_by'),
  version: integer('version').default(1),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at'),
  archivedBy: integer('archived_by')
} as const;

// Define users table first since it's referenced by other tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  emailVerified: boolean('email_verified').default(false),
  resetToken: text('reset_token'),
  resetTokenExpires: timestamp('reset_token_expires'),
  ...commonFields
});

// Now we can add the references to users table
const commonFieldsWithRefs = {
  ...commonFields,
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
  deletedBy: integer('deleted_by').references(() => users.id),
  archivedBy: integer('archived_by').references(() => users.id)
} as const;

export const usersRelations = relations(users, ({ many }: { many: any }) => ({
  runnerProfiles: many(runnerProfiles),
  trainingPlans: many(trainingPlans),
  performanceMetrics: many(performanceMetrics)
}));

// Runner profile information
export const runnerProfiles = pgTable('runner_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  experienceLevel: text('experience_level').notNull(), // beginner, intermediate, advanced
  weeklyMileage: decimal('weekly_mileage', { precision: 5, scale: 2 }),
  targetRace: text('target_race'),
  targetDate: timestamp('target_date'),
  preferredTrainingDays: jsonb('preferred_training_days'),
  ...commonFieldsWithRefs
});

export const runnerProfilesRelations = relations(runnerProfiles, ({ one }: { one: any }) => ({
  user: one(users, {
    fields: [runnerProfiles.userId],
    references: [users.id]
  })
}));

// Training plans
export const trainingPlans = pgTable('training_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: text('status').notNull(), // draft, active, completed
  type: text('type').notNull(), // 5k, 10k, half, full, custom
  difficulty: text('difficulty').notNull(), // beginner, intermediate, advanced
  ...commonFieldsWithRefs
});

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }: { one: any; many: any }) => ({
  user: one(users, {
    fields: [trainingPlans.userId],
    references: [users.id]
  }),
  workouts: many(workouts)
}));

// Workout templates
export const workoutTemplates = pgTable('workout_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // easy, tempo, intervals, long run, etc.
  difficulty: text('difficulty').notNull(),
  duration: integer('duration'), // in minutes
  distance: decimal('distance', { precision: 5, scale: 2 }), // in kilometers
  instructions: text('instructions'),
  ...commonFieldsWithRefs
});

export const workoutTemplatesRelations = relations(workoutTemplates, ({ many }: { many: any }) => ({
  workouts: many(workouts)
}));

// Workouts (instances of templates)
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => trainingPlans.id),
  templateId: uuid('template_id').references(() => workoutTemplates.id),
  scheduledDate: timestamp('scheduled_date').notNull(),
  status: text('status').notNull(), // scheduled, completed, skipped
  notes: text('notes'),
  actualDuration: integer('actual_duration'), // in minutes
  actualDistance: decimal('actual_distance', { precision: 5, scale: 2 }), // in kilometers
  actualPace: decimal('actual_pace', { precision: 5, scale: 2 }), // minutes per kilometer
  ...commonFieldsWithRefs
});

export const workoutsRelations = relations(workouts, ({ one, many }: { one: any; many: any }) => ({
  plan: one(trainingPlans, {
    fields: [workouts.planId],
    references: [trainingPlans.id]
  }),
  template: one(workoutTemplates, {
    fields: [workouts.templateId],
    references: [workoutTemplates.id]
  }),
  performanceMetrics: many(performanceMetrics)
}));

// Performance metrics
export const performanceMetrics = pgTable('performance_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id),
  workoutId: uuid('workout_id').references(() => workouts.id),
  metricType: text('metric_type').notNull(), // pace, distance, duration, etc.
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').notNull(), // km, min/km, etc.
  recordedAt: timestamp('recorded_at').notNull(),
  ...commonFieldsWithRefs
});

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }: { one: any }) => ({
  user: one(users, {
    fields: [performanceMetrics.userId],
    references: [users.id]
  }),
  workout: one(workouts, {
    fields: [performanceMetrics.workoutId],
    references: [workouts.id]
  })
}));

// Workout notes and feedback
export const workoutNotes = pgTable('workout_notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  workoutId: uuid('workout_id').notNull().references(() => workouts.id),
  content: text('content').notNull(),
  type: text('type').notNull(), // note, feedback
  rating: integer('rating'), // 1-5 rating for feedback
  tags: text('tags').array(),
  metrics: jsonb('metrics').$type<{
    perceivedEffort?: number;
    energyLevel?: number;
    sleepQuality?: number;
    nutritionQuality?: number;
    stressLevel?: number;
    recoveryStatus?: number;
  }>(),
  ...commonFieldsWithRefs
});

export const workoutNotesRelations = relations(workoutNotes, ({ one }: { one: any }) => ({
  user: one(users, {
    fields: [workoutNotes.userId],
    references: [users.id]
  }),
  workout: one(workouts, {
    fields: [workoutNotes.workoutId],
    references: [workouts.id]
  })
}));

// Audit trail table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(), // create, update, delete, archive, restore
  entityType: text('entity_type').notNull(), // user, trainingPlan, workout, etc.
  entityId: text('entity_id').notNull(),
  changes: jsonb('changes'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});
