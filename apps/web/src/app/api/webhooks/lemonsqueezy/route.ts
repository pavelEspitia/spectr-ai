import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/schema";
import { eq } from "drizzle-orm";

const WEBHOOK_SECRET = process.env["LEMONSQUEEZY_WEBHOOK_SECRET"] ?? "";

function verifySignature(
  body: string,
  signature: string,
): boolean {
  if (!WEBHOOK_SECRET) return false;
  const hmac = createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(body);
  const digest = hmac.digest("hex");
  return digest === signature;
}

interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { api_key_id?: string };
  };
  data: {
    id: string;
    attributes: {
      customer_id: number;
      status: string;
      variant_name: string;
      user_email: string;
    };
  };
}

function planFromVariant(variantName: string): {
  plan: string;
  limit: number;
} {
  const lower = variantName.toLowerCase();
  if (lower.includes("enterprise")) {
    return { plan: "enterprise", limit: 999999 };
  }
  if (lower.includes("pro")) {
    return { plan: "pro", limit: 999999 };
  }
  return { plan: "free", limit: 3 };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const event = payload.meta.event_name;
  const attrs = payload.data.attributes;
  const apiKeyId = payload.meta.custom_data?.api_key_id;

  if (
    event === "subscription_created" ||
    event === "subscription_updated"
  ) {
    const { plan, limit } = planFromVariant(attrs.variant_name);

    if (apiKeyId) {
      await db
        .update(apiKeys)
        .set({
          plan,
          dailyLimit: limit,
          lsCustomerId: String(attrs.customer_id),
          lsSubscriptionId: payload.data.id,
        })
        .where(eq(apiKeys.id, apiKeyId));
    } else {
      // Try to match by email
      const rows = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.email, attrs.user_email))
        .limit(1);

      if (rows[0]) {
        await db
          .update(apiKeys)
          .set({
            plan,
            dailyLimit: limit,
            lsCustomerId: String(attrs.customer_id),
            lsSubscriptionId: payload.data.id,
          })
          .where(eq(apiKeys.id, rows[0].id));
      }
    }
  }

  if (
    event === "subscription_cancelled" ||
    event === "subscription_expired"
  ) {
    if (apiKeyId) {
      await db
        .update(apiKeys)
        .set({ plan: "free", dailyLimit: 3 })
        .where(eq(apiKeys.id, apiKeyId));
    }
  }

  return NextResponse.json({ received: true });
}
