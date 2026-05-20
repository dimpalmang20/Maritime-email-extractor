import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const extractionJobsTable = pgTable("extraction_jobs", {
  id: serial("id").primaryKey(),
  emailText: text("email_text").notNull(),
  subject: text("subject"),
  emailType: text("email_type").notNull().default("Unknown"),
  pipeline: text("pipeline").notNull().default("rule-based"),
  confidence: real("confidence").notNull().default(0),
  extractedEntriesJson: text("extracted_entries_json").notNull().default("[]"),
  processingMs: integer("processing_ms").notNull().default(0),
  llmUsed: boolean("llm_used").notNull().default(false),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExtractionJobSchema = createInsertSchema(extractionJobsTable).omit({ id: true, createdAt: true });
export type InsertExtractionJob = z.infer<typeof insertExtractionJobSchema>;
export type ExtractionJob = typeof extractionJobsTable.$inferSelect;
