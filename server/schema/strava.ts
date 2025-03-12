import { pgTable, serial, text, boolean, timestamp, integer, real, doublePrecision } from "drizzle-orm/pg-core";
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
  mapPolyline: text('map_polyline'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertActivitySchema = createInsertSchema(activities);

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;