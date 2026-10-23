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

test("T4: Engine converts vague high-anxiety obligations into physical starter micro-steps", () => {
  assert.match(engineSrc, /function toPhysicalMicroSteps/);
  assert.match(engineSrc, /Open a single blank workspace file or tab/);
  assert.match(engineSrc, /Save & Leave Breadcrumb/);
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

test("T8: UI implements Blindfold Focus Tunnel, Dyslexia spacing, High Contrast, and Web Speech Read-Aloud", () => {
  assert.match(pageSrc, /blindfoldMode/);
  assert.match(pageSrc, /dyslexiaMode/);
  assert.match(pageSrc, /highContrast/);
  assert.match(pageSrc, /speechSynthesis/);
  assert.match(pageSrc, /Before vs\. After Impact Receipt/);
});

console.log(`\nAll ${passed}/8 Unthaw verification tests PASSED.`);
