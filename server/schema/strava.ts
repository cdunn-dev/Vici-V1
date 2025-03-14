import { pgTable, serial, text, boolean, timestamp, integer, real, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { workouts, users } from "@shared/schema";

// Define relationships between tables
export const stravaActivities = pgTable('strava_activities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  stravaId: text('strava_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  startDate: timestamp('start_date').notNull(),
  distance: doublePrecision('distance').notNull(),
  movingTime: integer('moving_time').notNull(),
  elapsedTime: integer('elapsed_time').notNull(),
  totalElevationGain: doublePrecision('total_elevation_gain'),
  averageSpeed: doublePrecision('average_speed'),
  maxSpeed: doublePrecision('max_speed'),
  averageHeartrate: doublePrecision('average_heartrate'),
  maxHeartrate: doublePrecision('max_heartrate'),
  startLatitude: text('start_latitude'),
  startLongitude: text('start_longitude'),
  gearId: text('gear_id'),
  deviceName: text('device_name'),
  averageCadence: doublePrecision('average_cadence'),
  averageTemp: doublePrecision('average_temp'),
  sufferScore: integer('suffer_score'),
  perceivedExertion: integer('perceived_exertion'),
  elevationHigh: doublePrecision('elevation_high'),
  elevationLow: doublePrecision('elevation_low'),
  startAddress: text('start_address'),
  achievementCount: integer('achievement_count'),
  kudosCount: integer('kudos_count'),
  commentCount: integer('comment_count'),
  athleteCount: integer('athlete_count'),
  photoCount: integer('photo_count'),
  deviceWatts: boolean('device_watts'),
  hasHeartrate: boolean('has_heartrate'),

  // Complex data types stored as JSONB for better querying and flexibility
  map: jsonb('map').$type<{
    summaryPolyline: string;
    resourceState: number;
    streamData?: {
      distance: number[];
      altitude: number[];
      velocity: number[];
      heartrate?: number[];
      cadence?: number[];
      watts?: number[];
      temp?: number[];
      time: number[];
    };
  }>(),

  laps: jsonb('laps').$type<{
    lapIndex: number;
    splitIndex: number;
    distance: number;
    elapsedTime: number;
    movingTime: number;
    startDate: string;
    averageSpeed: number;
    maxSpeed?: number;
    averageHeartrate?: number;
    maxHeartrate?: number;
    paceZone?: number;
  }[]>(),

  splitMetrics: jsonb('split_metrics').$type<{
    distance: number;
    elapsedTime: number;
    elevationDifference: number;
    movingTime: number;
    split: number;
    averageSpeed: number;
    averageHeartrate?: number;
    paceZone?: number;
  }[]>(),

  heartrateZones: jsonb('heartrate_zones').$type<{
    zone: number;
    min: number;
    max: number;
    timeInZone?: number;
  }[]>(),

  paceZones: jsonb('pace_zones').$type<{
    zone: number;
    description: string;
    pace: number;
    timeInZone?: number;
  }[]>(),

  // References to related tables
  workoutId: integer('workout_id').references(() => workouts.id),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Create insert schema with proper typing
export const insertActivitySchema = createInsertSchema(stravaActivities);

// Export types for use in application code
export type Activity = typeof stravaActivities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;