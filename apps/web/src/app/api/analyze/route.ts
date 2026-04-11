import { NextResponse } from "next/server";
import { analyzeAction } from "@/lib/actions";

export async function POST(request: Request) {
  let body: { fileName?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.fileName || !body.source) {
    return NextResponse.json(
      { error: "fileName and source are required" },
      { status: 400 },
    );
  }

  if (body.source.length > 100_000) {
    return NextResponse.json(
      { error: "File too large (max 100KB)" },
      { status: 400 },
    );
  }

  const result = await analyzeAction(body.fileName, body.source);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ id: result.id });
}
