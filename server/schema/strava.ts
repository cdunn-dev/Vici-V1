import { pgTable, serial, text, boolean, timestamp, integer, real, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

export const activities = pgTable('strava_activities', {
  id: serial('id').primaryKey(),
  stravaId: text('strava_id').notNull().unique(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
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

  // Complex data types stored as JSONB
  map: jsonb('map'),
  laps: jsonb('laps'),
  splitMetrics: jsonb('split_metrics'),
  heartrateZones: jsonb('heartrate_zones'),
  paceZones: jsonb('pace_zones'),

  workoutId: integer('workout_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertActivitySchema = createInsertSchema(activities);

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;