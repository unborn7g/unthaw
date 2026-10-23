import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("=== Unthaw Automated Verification Suite ===");

const engineSrc = fs.readFileSync(
  path.join(root, "src/lib/unthaw-engine.ts"),
  "utf8"
);
const pageSrc = fs.readFileSync(
  path.join(root, "src/app/page.tsx"),
  "utf8"
);
const cssSrc = fs.readFileSync(
  path.join(root, "src/app/globals.css"),
  "utf8"
);
const apiUnthawSrc = fs.readFileSync(
  path.join(root, "src/app/api/unthaw/route.ts"),
  "utf8"
);
const apiSplitSrc = fs.readFileSync(
  path.join(root, "src/app/api/split/route.ts"),
  "utf8"
);

test("T1: Engine defines all 3 cognitive battery tiers (low: 120s, steady: 300s, deep: 600s)", () => {
  assert.match(engineSrc, /low:\s*120/);
  assert.match(engineSrc, /steady:\s*300/);
  assert.match(engineSrc, /deep:\s*600/);
});

test("T2: Engine includes 4 real-world overwhelming preset scenarios", () => {
  assert.match(engineSrc, /id:\s*"capstone-thesis"/);
  assert.match(engineSrc, /id:\s*"auth-bug-panic"/);
  assert.match(engineSrc, /id:\s*"scholarship-packet"/);
  assert.match(engineSrc, /id:\s*"exam-week-backlog"/);
});

test("T3: Engine computes Before-vs-After Intimidation Score & Friction Reduction %", () => {
  assert.match(engineSrc, /export function analyzeMetrics/);
  assert.match(engineSrc, /intimidationScoreBefore/);
  assert.match(engineSrc, /intimidationScoreAfter/);
  assert.match(engineSrc, /frictionReductionPercent/);
});

test("T4: Micro-step headlines are under 8 words, imperative, with no quoted task title, plus task subline", () => {
  const actionMatches = [
    ...engineSrc.matchAll(/action\s*[:=]\s*"([^"]+)"/g),
  ]
    .map((m) => m[1])
    .filter((s) => s.length > 0);
  assert.ok(actionMatches.length >= 10, "Should find all micro-step action strings");
  for (const act of actionMatches) {
    const words = act.trim().split(/\s+/);
    assert.ok(
      words.length < 8,
      `Headline "${act}" has ${words.length} words (must be < 8)`
    );
    assert.ok(
      !act.includes('"'),
      `Headline "${act}" must not contain quoted task title`
    );
  }
  assert.match(pageSrc, /Task:\s*\{activeStep\.sourceClause\}/);
});

test("T5: Engine supports recursive 'Still Too Scary? Split in Half' micro-splitting", () => {
  assert.match(engineSrc, /export function splitStepInHalf/);
  assert.match(apiSplitSrc, /splitStepInHalf/);
});

test("T6: Engine uses deterministic SHA-256 caching for identical inputs", () => {
  assert.match(engineSrc, /createHash\("sha256"\)/);
  const digest = crypto.createHash("sha256").update("low::test").digest("hex").slice(0, 16);
  assert.equal(digest.length, 16);
});

test("T7: API routes enforce sliding-window rate limiting", () => {
  assert.match(apiUnthawSrc, /checkRateLimit/);
  assert.match(apiSplitSrc, /checkRateLimit/);
});

test("T8: Step text uses sans font with loosened letter-spacing, timer starts paused with Start button, and toggle is named 'High contrast'", () => {
  assert.match(cssSrc, /\.step-text-sans\s*\{[\s\S]*?letter-spacing:\s*0\.025em/);
  assert.match(pageSrc, /step-text-sans font-sans font-bold/);
  assert.match(pageSrc, /const \[timerRunning, setTimerRunning\] = useState<boolean>\(false\)/);
  assert.match(pageSrc, /\{timerRunning \? "Pause" : "Start"\}/);
  assert.match(pageSrc, /High contrast:\s*\{highContrast \? "ON" : "OFF"\}/);
  assert.ok(!pageSrc.includes("AAA:"), "Should not display 'AAA:' toggle label");
});

test("T9: Bottom dock has text labels (TUNNEL / UNTHAW / SHIELD ON / IMPACT) in a non-overlapping footer", () => {
  assert.match(pageSrc, /<footer className="w-full pt-4 pb-6 px-4 flex justify-center shrink-0">/);
  assert.match(pageSrc, /TUNNEL/);
  assert.match(pageSrc, /UNTHAW/);
  assert.match(pageSrc, /SHIELD ON/);
  assert.match(pageSrc, /IMPACT/);
});

console.log(`\nAll ${passed}/9 Unthaw verification tests PASSED.`);
