import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { users } from "../schema";

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const insertUserSchema = createInsertSchema(users);

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
