# Taskforge Devpost Submission Copy — Unthaw

Use this ready-to-paste copy when submitting **Unthaw** at `https://taskforge.devpost.com/` before **Saturday, October 24, 2026 at 10:00 PM WAT (5:00 PM EDT)**.

---

## Basic Fields

- **Project Name:** `Unthaw`
- **Elevator Pitch / Tagline:** Every freeze melts one micro-step at a time — an accessible task-paralysis breaker that hides overwhelming backlogs behind Blindfold Mode and gives you one 90-second physical action at a time.
- **Built With:** `nextjs`, `react`, `typescript`, `tailwindcss`, `web-speech-api`, `accessibility`
- **Try It Out Links:**
  - **Live App:** `https://unthaw-ten.vercel.app/`
  - **GitHub Repository:** `https://github.com/unborn7g/unthaw`

---

## Project Story (Copy & Paste into Devpost Description)

### Inspiration: The User & The Barrier
We built **Unthaw** for neurodivergent students (ADHD, autism, dyslexia) and overwhelmed builders facing **task-initiation paralysis (executive dysfunction)**.

Nearly every productivity app—Notion, Todoist, Jira, Linear—is designed for people whose brains are already calm and ready to plan. When a student is staring at a terrifying syllabus prompt (*"Write a 12-page capstone paper on distributed consensus by Friday with 15 peer-reviewed citations and latency benchmarks"*) or a chaotic life backlog, traditional to-do lists make the freeze **worse**: they display 15 unstarted checkboxes at once, flash red overdue warnings, and list vague multi-hour tasks with no physical starting point.

### What Unthaw Does (The Meaningful Change)
Instead of giving you another giant list to manage, **Unthaw** changes how the task meets your brain:

1. **Dump What Is Freezing You + Pick Your Cognitive Battery:** Paste a messy assignment, syllabus block, or backlog and select your real-time energy level (**Low Battery · 90s–2m**, **Steady · 5m**, or **Deep Flow · 10m**).
2. **Verb-First Micro-Step Compiler:** Unthaw scans the text for cognitive-overload triggers (page counts, deadlines, multi-clause density, and abstract high-anxiety verbs like *"Write"*, *"Clean"*, or *"Finish"*) and rewrites them into zero-friction physical starter actions (for example, turning *"Write 12-page thesis"* into *"Open a blank document, type a rough working title at the top, and write 3 messy bullet points"*).
3. **Blindfold Focus Tunnel:** By default, Unthaw hides steps 2 through N behind a **Blindfold Shield**. You only see **Step 1** and a calm countdown ring. Your brain cannot panic about step 6 when only a 90-second action is on screen.
4. **"Still Too Scary? Split in Half" (`S`):** If the current micro-step still feels too big, one button press cuts it in half into a 60-second physical setup step and an execution step.
5. **Accessibility-First Toolbar:** Includes one-click **Dyslexia-Friendly Reading Spacing**, **WCAG AAA High-Contrast Mode**, **Web Speech API Read-Aloud (`R`)** for reading fatigue, and full keyboard control (`Space`, `Enter`, `S`, `B`, `R`).
6. **Before-vs-After Impact Receipt:** Every run produces a live side-by-side comparison showing the raw wall of text vs. the single 90-second starter action, reducing measured task intimidation from **92/100 down to 14/100 (-85% friction)**.

### How We Built It
- **Frontend & Accessibility UX:** Next.js 15 App Router, React 19, and Tailwind CSS with ARIA live regions (`aria-live="polite"`), keyboard shortcuts, Web Speech synthesis, dyslexia spacing CSS tokens, and high-contrast theming.
- **Deterministic Unthaw Engine (`src/lib/unthaw-engine.ts`):** Built from scratch with TypeScript and Node `crypto` SHA-256 caching. Works 100% offline/locally with zero fragile API keys so judges can test every preset and custom input immediately.
- **Verification:** Automated test suite (`npm test`) verifying battery tier sizing, cognitive-load scoring, physical verb rewriting, recursive step splitting, SHA-256 caching, rate limiting, and accessibility controls.

### Pre-Existing Components Disclosure
All application code in `Unthaw` was written from scratch during the Taskforge hackathon using standard open-source packages (`next`, `react`, `tailwindcss`, `typescript`).
