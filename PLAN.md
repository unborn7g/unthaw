# Unthaw — Official Build Plan (Taskforge Hackathon)

**Tagline:** *Every freeze melts one micro-step at a time.*  
**Target Hackathon:** Taskforge (`https://taskforge.devpost.com/` · `$200` USD First Place Cash · Deadline: Saturday 24 Oct 2026 @ 17:00 EDT / 22:00 WAT)  
**Target User:** Neurodivergent students, ADHD builders, and overwhelmed knowledge workers experiencing **task-initiation paralysis (executive dysfunction)** when facing vague, multi-hour assignments or tangled backlogs.  
**Named Barrier:** Traditional to-do lists display every unfinished item simultaneously, triggering threat-response overwhelm ("wall of awful") because the brain cannot resolve a vague outcome ("Write 12-page capstone report") into a 90-second physical motor action.

---

## 1. Rubric Mapping (`Taskforge` — 50% Impact / 50% Technical Execution)

| Criterion | Weight | How `Unthaw` Wins Full Marks |
| :--- | :--- | :--- |
| **Impact** | **50%** | Solves a universal, deeply felt barrier (task paralysis / executive dysfunction) with a measurable **Before-vs-After Impact Receipt** (Intimidation Score `0–100` -> First-Step Activation Latency `< 90s`, Blindfold Focus Tunnel that hides the scary backlog, recursive `"Still Too Big? Split in Half"` micro-slicer, and built-in Dyslexia / High-Contrast / Read-Aloud accessibility). |
| **Technical Execution** | **50%** | Zero-dependency deterministic Cognitive-Load & Verb-First Micro-Step Compiler (`src/lib/unthaw-engine.ts`) with optional LLM enrichment, SHA-256 content caching, recursive sub-step halving, keyboard-first WCAG AAA accessibility (`Space`, `Enter`, `S`, `B`, `R`), rate-limited API routes (`/api/unthaw`, `/api/split`), and 100% passing automated test suite (`npm test`). |

---

## 2. Core Architecture (`hackathon/taskforge/unthaw/`)

1. **`src/lib/unthaw-engine.ts` — Deterministic Task-Paralysis Decomposer & Cognitive Load Analyzer:**
   - **Input:** Raw overwhelming text (syllabus block, assignment prompt, bug report, messy todo list) + `battery: "low" | "steady" | "deep"`.
   - **Intimidation Score (`0–100`):** Computed deterministically from task count, abstract/outcome-noun density (`report`, `thesis`, `refactor`, `entire`, `complete`, `study`), missing physical starter verb penalty, and estimated total minutes.
   - **Physical Starter Rewriter:** Guarantees Step #1 is ALWAYS a zero-friction physical motor action (`<= 2 min` in `low` battery mode) that requires zero creative decisions (e.g., *"Open your editor, create `capstone-draft.md`, and type only the working title and 3 placeholder headings"*).
   - **Recursive Micro-Split (`splitMicroStep`):** If the user clicks **"Still Too Big? Split in Half"** (`S`), splits the active micro-step into two smaller 60-second physical actions in-place without exposing the rest of the hidden list.
   - **SHA-256 Content Cache & Sliding-Window Rate Limiter (`src/lib/rate-limit.ts`).**
2. **Single-Screen Calm Interface (`src/app/page.tsx`):**
   - **1-Click Preset Scenarios:** (1) *12-Page Capstone Thesis Freeze*, (2) *Production Auth Bug Panic*, (3) *Financial Aid & Scholarship Forms*, (4) *Overwhelming Exam Week Backlog*.
   - **Cognitive Battery Selector:** `Low Battery (2m micro-steps)` · `Steady (5m steps)` · `Deep Flow (10m steps)`.
   - **Blindfold Focus Tunnel (Center Stage):** Hides all upcoming steps behind a calm frosted barrier (`X steps safely hidden so you can breathe`) and displays ONLY the active micro-step, a tactile SVG countdown/breathing ring, `"Still Too Big? Split in Half (S)"`, `"Read Aloud (R)"`, and `"Done — Melt Next Step (Enter)"`.
   - **Before-vs-After Impact Comparison Panel:** Shows the raw intimidating input side-by-side against the unthawed micro-sequence, quantifying Intimidation Score drop, average step duration drop, and completed momentum streak.
   - **Accessibility Toolbar:** Dyslexia-Friendly Typography toggle, High-Contrast Mode toggle, Reduced-Motion toggle, and Web Speech API voice readout.
