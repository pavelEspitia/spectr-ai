import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  apiKeyId: text("api_key_id"),
  fileName: text("file_name").notNull(),
  language: text("language").notNull(),
  source: text("source").notNull(),
  report: text("report").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: text("created_at").notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  email: text("email").notNull(),
  plan: text("plan").notNull().default("free"),
  lsCustomerId: text("ls_customer_id"),
  lsSubscriptionId: text("ls_subscription_id"),
  dailyLimit: integer("daily_limit").notNull().default(3),
  usageToday: integer("usage_today").notNull().default(0),
  usageResetAt: text("usage_reset_at").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});
