import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createUnthawPlan,
  PRESET_SCENARIOS,
  type BatteryLevel,
} from "@/lib/unthaw-engine";

export async function GET() {
  const defaultPreset = PRESET_SCENARIOS[0];
  const initialPlan = createUnthawPlan(defaultPreset.rawText, defaultPreset.battery);
  return NextResponse.json({
    presets: PRESET_SCENARIOS,
    plan: initialPlan,
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`unthaw:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Take a slow breath and try again in a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const rawInput = String(body.rawInput || "");
    const battery: BatteryLevel = ["low", "steady", "deep"].includes(body.battery)
      ? body.battery
      : "low";

    const plan = createUnthawPlan(rawInput, battery);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to unthaw task" },
      { status: 400 }
    );
  }
}
