import crypto from "node:crypto";

export type BatteryLevel = "low" | "steady" | "deep";

export interface MicroStep {
  id: string;
  index: number;
  action: string;
  whyItWorks: string;
  durationSeconds: number;
  physicalVerb: string;
  sourceClause: string;
  canSplit: boolean;
  splitDepth: number;
}

export interface BeforeAfterMetrics {
  rawWordCount: number;
  rawItemCount: number;
  intimidationScoreBefore: number; // 0-100
  intimidationScoreAfter: number; // 0-100
  estimatedTotalMinutes: number;
  firstStepSeconds: number;
  frictionReductionPercent: number;
  cognitiveHazardsFound: string[];
}

export interface UnthawPlan {
  id: string;
  cacheKey: string;
  cached: boolean;
  battery: BatteryLevel;
  title: string;
  rawInput: string;
  calmReframe: string;
  steps: MicroStep[];
  metrics: BeforeAfterMetrics;
  createdAt: string;
}

export interface PresetScenario {
  id: string;
  label: string;
  persona: string;
  barrierTag: string;
  battery: BatteryLevel;
  rawText: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "capstone-thesis",
    label: "12-Page Capstone Thesis Freeze",
    persona: "Final-year CS student with ADHD staring at a blank cursor 48h before deadline",
    barrierTag: "Ambiguous Giant Deliverable",
    battery: "low",
    rawText: `Write the complete 12-page Senior Capstone Research Paper on Distributed Fault Tolerance by Friday 5pm. Must include abstract, literature review citing 15 IEEE papers, system architecture diagram, benchmark evaluation tables, failure-mode discussion, and formatted bibliography.`,
  },
  {
    id: "auth-bug-panic",
    label: "Production Auth Bug & Messy Slack Handoff",
    persona: "Student intern waking up to 30 urgent messages and a broken OAuth callback",
    barrierTag: "High-Anxiety Debugging Overload",
    battery: "steady",
    rawText: `Fix the intermittent 401 session drop bug in production OAuth callback before the demo, reproduce the race condition locally, audit token refresh middleware, add regression unit tests, update the environment docs, and post root-cause summary in #eng-handoff.`,
  },
  {
    id: "scholarship-packet",
    label: "Financial Aid & Scholarship Application Wall",
    persona: "First-generation university student overwhelmed by multi-agency paperwork",
    barrierTag: "Administrative & Bureaucratic Paralysis",
    battery: "low",
    rawText: `Complete the STEM Renewal Scholarship & Financial Aid Verification Packet: gather 2025 tax transcripts, write 500-word personal impact statement, request faculty recommendation letter from Prof. Adeyemi, itemize tuition/housing budget spreadsheet, and upload signed PDFs to portal.`,
  },
  {
    id: "exam-week-backlog",
    label: "3-Exam Week + Group Project pileup",
    persona: "Working student juggling Operating Systems midterm, Linear Algebra problem set, and lab slides",
    barrierTag: "Multi-Course Context-Switching Freeze",
    battery: "steady",
    rawText: `Study Chapters 4-7 on Virtual Memory and Page Replacement for Operating Systems midterm; finish 10 proofs in Linear Algebra Problem Set #6; build 6 slides for Friday's Database Lab presentation; reply to lab partner's pull request.`,
  },
];

const HIGH_FRICTION_WORDS: Array<{ pattern: RegExp; label: string; weight: number }> = [
  { pattern: /\b(complete|entire|full|whole|everything|all)\b/i, label: "All-or-nothing scope trigger", weight: 14 },
  { pattern: /\b(\d+\s*-\s*page|\d+\s+pages|\d+\s+papers|\d+\s+proofs|\d+\s+chapters)\b/i, label: "High-volume quota intimidation", weight: 18 },
  { pattern: /\b(write|research|study|refactor|audit|investigate|build|design)\b/i, label: "Unbounded cognitive verb (no clear first physical click)", weight: 12 },
  { pattern: /\b(by\s+friday|before\s+the\s+demo|urgent|deadline|midterm|production)\b/i, label: "Time-pressure threat spike", weight: 14 },
  { pattern: /[,;].*[,;].*[,;]/, label: "Multi-deliverable clause stacking (>3 obligations in one breath)", weight: 16 },
];

const BATTERY_SECONDS: Record<BatteryLevel, number> = {
  low: 120, // 2-minute micro-actions
  steady: 300, // 5-minute momentum steps
  deep: 600, // 10-minute deep steps
};

const planCache = new Map<string, UnthawPlan>();

export function computeCacheKey(rawInput: string, battery: BatteryLevel): string {
  return crypto
    .createHash("sha256")
    .update(`${battery}::${rawInput.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
}

function splitIntoClauses(rawText: string): string[] {
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\b(must include|including|and also|plus)\b/gi, "; ")
    .trim();

  const rawParts = normalized
    .split(/(?:\n+|[;•]|\.\s+|,\s+(?=(?:write|read|open|fix|reproduce|audit|add|update|post|gather|request|itemize|upload|study|finish|build|reply|create|cite|check|draft|review|test)\b))/i)
    .map((s) => s.replace(/^[-*0-9.)\s]+/, "").trim())
    .filter((s) => s.length >= 4);

  if (rawParts.length > 1) return rawParts;

  const commaParts = normalized
    .split(/,\s+(?:and\s+)?|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  return commaParts.length > 1 ? commaParts : [normalized];
}

function toPhysicalMicroSteps(
  clauses: string[],
  battery: BatteryLevel
): MicroStep[] {
  const baseSeconds = BATTERY_SECONDS[battery];
  const steps: MicroStep[] = [];

  // Step 1 is ALWAYS a zero-decision workspace ignition step (<8 words, imperative, no quoted title).
  const firstClause = clauses[0] || "your task";
  const cleanTopic = firstClause
    .replace(/^(write|complete|finish|study|fix|build|create)\s+(the\s+|a\s+)?/i, "")
    .slice(0, 72);

  steps.push({
    id: "step-1",
    index: 1,
    action: "Open a blank file, type three words.",
    whyItWorks:
      "Bypasses perfectionism by separating physical file setup from creative thinking (Activation Energy < 90s).",
    durationSeconds: Math.min(90, baseSeconds),
    physicalVerb: "Open & Type 3 Words",
    sourceClause: cleanTopic,
    canSplit: true,
    splitDepth: 0,
  });

  clauses.forEach((clause, idx) => {
    const lower = clause.toLowerCase();
    let action = "";
    let verb = "Draft";
    let why = "Converts a vague obligation into a bounded, single-object physical action.";

    if (/(literature|papers|cit(e|ing)|sources|bibliography)/i.test(lower)) {
      verb = "Collect 3 Links";
      action = "Paste three source links into your notes.";
      why = "Separates link collection from deep reading so you do not get lost in 20 browser tabs.";
    } else if (/(diagram|architecture|chart|slide)/i.test(lower)) {
      verb = "Sketch Boxes";
      action = "Sketch four simple boxes with arrows.";
      why = "Plain-text wireframing removes visual-formatting friction during initiation.";
    } else if (/(bug|reproduce|401|oauth|error|fix|test|race)/i.test(lower)) {
      verb = "Run & Log One Line";
      action = "Run one test and log the output.";
      why = "Observing one real output replaces anxiety with concrete diagnostic feedback.";
    } else if (/(tax|transcript|form|upload|spreadsheet|budget|packet)/i.test(lower)) {
      verb = "Create Folder & Drop 1 File";
      action = "Create one folder and drop one file.";
      why = "Physical file staging eliminates administrative overwhelm.";
    } else if (/(email|letter|prof|request|reply|post|slack)/i.test(lower)) {
      verb = "Write 2-Sentence Draft";
      action = "Draft two rough sentences in your notes.";
      why = "Drafting offline prevents notification hijacking while composing.";
    } else if (/(study|chapter|proof|problem set|exam|midterm)/i.test(lower)) {
      verb = "Scan Headings Only";
      action = "Scan the headings and copy three terms.";
      why = "Pre-scanning builds a mental map without triggering test-anxiety freeze.";
    } else {
      verb = "Write Ugly First Paragraph";
      action = "Write three rough bullet points right now.";
      why = "Giving yourself permission to write rough bullets shuts down the internal critic.";
    }

    steps.push({
      id: `step-${steps.length + 1}`,
      index: steps.length + 1,
      action,
      whyItWorks: why,
      durationSeconds: baseSeconds,
      physicalVerb: verb,
      sourceClause: clause,
      canSplit: true,
      splitDepth: 0,
    });

    if (battery === "low" && idx === 0 && clauses.length <= 2) {
      steps.push({
        id: `step-${steps.length + 1}`,
        index: steps.length + 1,
        action: "Expand your easiest bullet by two sentences.",
        whyItWorks: "Builds momentum from your own words instead of starting cold.",
        durationSeconds: 120,
        physicalVerb: "Expand 1 Bullet",
        sourceClause: clause,
        canSplit: true,
        splitDepth: 0,
      });
    }
  });

  // Final closure micro-step (<8 words, imperative, no quotes)
  steps.push({
    id: `step-${steps.length + 1}`,
    index: steps.length + 1,
    action: "Save your file and leave one note.",
    whyItWorks: "Leaves a warm breadcrumb so your next session starts with zero friction.",
    durationSeconds: 60,
    physicalVerb: "Save & Leave Breadcrumb",
    sourceClause: cleanTopic,
    canSplit: false,
    splitDepth: 0,
  });

  return steps;
}

export function analyzeMetrics(
  rawInput: string,
  clauses: string[],
  steps: MicroStep[]
): BeforeAfterMetrics {
  const words = rawInput.trim().split(/\s+/).filter(Boolean);
  const hazards: string[] = [];
  let score = 28;

  for (const h of HIGH_FRICTION_WORDS) {
    if (h.pattern.test(rawInput)) {
      hazards.push(h.label);
      score += h.weight;
    }
  }

  score += Math.min(20, clauses.length * 4);
  if (words.length > 25) score += 8;

  const intimidationScoreBefore = Math.min(98, Math.max(42, score));
  const firstStepSeconds = steps[0]?.durationSeconds ?? 90;
  const intimidationScoreAfter = Math.max(
    11,
    Math.round(intimidationScoreBefore * (firstStepSeconds <= 120 ? 0.18 : 0.24))
  );
  const frictionReductionPercent = Math.round(
    ((intimidationScoreBefore - intimidationScoreAfter) / intimidationScoreBefore) * 100
  );

  if (hazards.length === 0) {
    hazards.push("Unstructured multi-step cognitive load");
  }

  const estimatedTotalMinutes = Math.max(
    10,
    Math.round(steps.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)
  );

  return {
    rawWordCount: words.length,
    rawItemCount: clauses.length,
    intimidationScoreBefore,
    intimidationScoreAfter,
    estimatedTotalMinutes,
    firstStepSeconds,
    frictionReductionPercent,
    cognitiveHazardsFound: hazards,
  };
}

export function createUnthawPlan(
  rawInput: string,
  battery: BatteryLevel = "low"
): UnthawPlan {
  const cleaned = rawInput.trim();
  if (!cleaned) {
    throw new Error("Please enter or select a task to unthaw.");
  }

  const cacheKey = computeCacheKey(cleaned, battery);
  const existing = planCache.get(cacheKey);
  if (existing) {
    return { ...existing, cached: true };
  }

  const clauses = splitIntoClauses(cleaned);
  const steps = toPhysicalMicroSteps(clauses, battery);
  const metrics = analyzeMetrics(cleaned, clauses, steps);

  const firstWords = cleaned.split(/\s+/).slice(0, 7).join(" ");
  const title = firstWords.length < cleaned.length ? `${firstWords}…` : firstWords;

  const calmReframe = `You do not have to finish all ${clauses.length} part${
    clauses.length === 1 ? "" : "s"
  } right now. Everything except Step 1 is safely hidden behind Blindfold Mode—all you need is ${Math.round(
    steps[0].durationSeconds / 60
  )} minute${steps[0].durationSeconds <= 60 ? "" : "s"} to cross the starting line.`;

  const plan: UnthawPlan = {
    id: `unthaw-${cacheKey.slice(0, 8)}`,
    cacheKey,
    cached: false,
    battery,
    title,
    rawInput: cleaned,
    calmReframe,
    steps,
    metrics,
    createdAt: new Date().toISOString(),
  };

  planCache.set(cacheKey, plan);
  return plan;
}

export function splitStepInHalf(step: MicroStep): [MicroStep, MicroStep] {
  const halfDuration = Math.max(45, Math.round(step.durationSeconds / 2));
  const nextDepth = (step.splitDepth || 0) + 1;

  const partA: MicroStep = {
    id: `${step.id}-a`,
    index: step.index,
    action: "Open the file and place your cursor.",
    whyItWorks:
      "Halves the activation threshold so your hands move before your brain can overthink.",
    durationSeconds: halfDuration,
    physicalVerb: `${step.physicalVerb} (Setup)`,
    sourceClause: step.sourceClause,
    canSplit: nextDepth < 3,
    splitDepth: nextDepth,
  };

  const partB: MicroStep = {
    id: `${step.id}-b`,
    index: step.index + 1,
    action: "Type three rough words on line one.",
    whyItWorks:
      "With the file already open in front of you, completing the micro-action takes half the effort.",
    durationSeconds: halfDuration,
    physicalVerb: `${step.physicalVerb} (Finish)`,
    sourceClause: step.sourceClause,
    canSplit: nextDepth < 3,
    splitDepth: nextDepth,
  };

  return [partA, partB];
}
