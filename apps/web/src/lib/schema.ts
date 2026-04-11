import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  fileName: text("file_name").notNull(),
  language: text("language").notNull(),
  source: text("source").notNull(),
  report: text("report").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: text("created_at").notNull(),
});
