import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { splitStepInHalf, type MicroStep } from "@/lib/unthaw-engine";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`split:${ip}`, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const step = body.step as MicroStep;
    if (!step || !step.action) {
      return NextResponse.json({ error: "Missing step payload" }, { status: 400 });
    }
    const [partA, partB] = splitStepInHalf(step);
    return NextResponse.json({ parts: [partA, partB] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to split step" },
      { status: 400 }
    );
  }
}
