import { db } from "./db";
import { apiKeys } from "./schema";
import { eq } from "drizzle-orm";

export interface AuthResult {
  valid: boolean;
  error?: string;
  apiKey?: typeof apiKeys.$inferSelect;
}

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 999999,
  enterprise: 999999,
};

export async function authenticateApiKey(
  request: Request,
): Promise<AuthResult> {
  const header = request.headers.get("x-api-key");
  if (!header) {
    return { valid: false, error: "Missing x-api-key header" };
  }

  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, header))
    .limit(1);

  const key = rows[0];
  if (!key) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!key.active) {
    return { valid: false, error: "API key is deactivated" };
  }

  // Reset daily usage if new day
  const today = new Date().toISOString().slice(0, 10);
  if (key.usageResetAt !== today) {
    await db
      .update(apiKeys)
      .set({ usageToday: 0, usageResetAt: today })
      .where(eq(apiKeys.id, key.id));
    key.usageToday = 0;
  }

  const limit = PLAN_LIMITS[key.plan] ?? 3;
  if (key.usageToday >= limit) {
    return {
      valid: false,
      error: `Daily limit reached (${limit} audits/day on ${key.plan} plan). Upgrade at https://noctis.lemonsqueezy.com`,
    };
  }

  return { valid: true, apiKey: key };
}

export async function incrementUsage(keyId: string): Promise<void> {
  const rows = await db
    .select({ usage: apiKeys.usageToday })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  const current = rows[0]?.usage ?? 0;
  await db
    .update(apiKeys)
    .set({ usageToday: current + 1 })
    .where(eq(apiKeys.id, keyId));
}
