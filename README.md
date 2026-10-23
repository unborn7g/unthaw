# Unthaw

> **Every freeze melts one micro-step at a time.**
> Built for the **Taskforge Hackathon** (`https://taskforge.devpost.com/`).

---

## 1. Who It Is For & The Barrier It Solves

- **Target User:** Neurodivergent students (ADHD, autism, dyslexia) and overwhelmed builders or knowledge workers experiencing **executive dysfunction and task-initiation paralysis**.
- **The Productivity & Access Barrier:** Traditional productivity tools (Notion, Jira, Todoist, Linear) assume the user's brain is ready to plan and execute. When a user is frozen by an overwhelming assignment or backlog, showing 15 checkboxes, red overdue badges, and multi-hour estimates triggers a threat response (**task paralysis**) that causes avoidance.
- **The Meaningful Change (`Before vs. After`):**
  - **Before:** The user stares at a tangled wall of text (e.g., *"Write 12-page capstone paper on distributed consensus by Friday; find 15 peer-reviewed citations; run latency benchmarks..."* — **Intimidation Score: 92/100**) with zero clear physical starting point.
  - **After:** **Unthaw** asks for the user's current **Cognitive Battery** (`Low 2m`, `Steady 5m`, or `Deep 10m`), converts abstract obligations into concrete **90-second physical starter actions**, and activates **Blindfold Mode** — hiding every upcoming step behind a calm shield so the user's working memory only sees **1 micro-step at a time** (**Intimidation Score: 14/100 · 85% friction reduction**). If Step 1 still feels too big, pressing **`Still Too Scary? Split in Half (S)`** cuts it into two 60-second micro-actions.

---

## 2. Core Features

1. **Deterministic Cognitive-Load & Micro-Step Compiler (`src/lib/unthaw-engine.ts`):**
   - Scores raw task text for cognitive hazards (page/citation demands, deadline pressure, multi-clause density, high-anxiety abstract verbs) and outputs a reproducible `0–100` Intimidation Score.
   - Rewrites vague verbs (*"Write thesis"*, *"Clean room"*, *"Apply to jobs"*) into concrete physical starter actions (*"Open a blank document, type a rough working title at the top, and write 3 messy bullet points"*).
2. **Blindfold Focus Tunnel (`src/app/page.tsx`):**
   - Renders **only the single active micro-step** with a calm SVG countdown ring (`Space` to start/pause, `Enter` to complete and reveal the next step).
   - Keeps all remaining steps tucked behind the Blindfold Shield so the backlog cannot overwhelm the user.
3. **Recursive `"Still Too Scary? Split in Half"` Button (`/api/split`):**
   - Splits any active step into a 60-second physical setup half and an execution half on the fly.
4. **First-Class Accessibility Toolbar:**
   - **Dyslexia-Friendly Spacing Mode** (expanded letter/word tracking and 1.85 line height).
   - **WCAG AAA High-Contrast Mode** (pure crisp ink on white with bold borders).
   - **One-Click Read-Aloud** (Web Speech API voice synthesis for users experiencing visual reading fatigue).
   - **Full Keyboard Navigation** (`Space`, `Enter`, `S`, `B`, `R`).
5. **Before-vs-After Impact Receipt:**
   - Side-by-side comparison quantifying raw obligation count, Intimidation Score drop, and activation energy in seconds.

---

## 3. Built From Scratch for Taskforge

All application code in `Unthaw` (`src/lib/unthaw-engine.ts`, `src/lib/rate-limit.ts`, `src/app/api/unthaw/route.ts`, `src/app/api/split/route.ts`, `src/app/page.tsx`, and `test/run-tests.mjs`) was designed and built from scratch during the Taskforge hackathon period using standard open-source frameworks (Next.js 15, React 19, Tailwind CSS, and TypeScript). Zero paid API keys or external database credentials are required.

---

## 4. Quick Start & Verification

```bash
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:3000` to use **Unthaw**.
