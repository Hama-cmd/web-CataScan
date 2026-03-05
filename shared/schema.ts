import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

export const screenings = sqliteTable("screenings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  imageUrl: text("image_url").notNull(),
  analysis: text("analysis", { mode: 'json' }).notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertScreeningSchema = createInsertSchema(screenings).omit({
  id: true,
  createdAt: true
});

export type Screening = typeof screenings.$inferSelect;
export type InsertScreening = z.infer<typeof insertScreeningSchema>;

export type AnalyzeImageRequest = {
  image: string; // Base64
};

export type AnalysisResult = {
  condition: string;
  confidence: string;
  description: string;
  recommendation: string;
  disclaimer: string;
};
