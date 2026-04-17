import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/schema";

function generateApiKey(): string {
  return `sk_spectr_${randomBytes(24).toString("hex")}`;
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.email || !body.email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 },
    );
  }

  const id = nanoid(12);
  const key = generateApiKey();
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(apiKeys).values({
    id,
    key,
    email: body.email,
    plan: "free",
    dailyLimit: 3,
    usageToday: 0,
    usageResetAt: today,
    active: 1,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    apiKey: key,
    plan: "free",
    dailyLimit: 3,
    message:
      "Save this key — it won't be shown again. Upgrade at https://noctis.lemonsqueezy.com for unlimited audits.",
  });
}
