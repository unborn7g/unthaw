"use client";

import React, { useEffect, useState, useCallback } from "react";
import type {
  BatteryLevel,
  MicroStep,
  PresetScenario,
  UnthawPlan,
} from "@/lib/unthaw-engine";

function UnthawBrandLogo({
  thawRatio = 0.25,
  isSpinning = false,
}: {
  thawRatio?: number;
  isSpinning?: boolean;
}) {
  const warmOpacity = Math.min(1, Math.max(0.25, thawRatio));
  return (
    <div className="relative inline-flex items-center justify-center w-11 h-11 rounded-2xl p-[1.5px] bg-gradient-to-br from-sky-400 via-amber-400 to-emerald-400 shadow-lg shadow-amber-500/20 group">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`w-full h-full rounded-[14px] bg-[#0B1220] transition-transform duration-500 group-hover:scale-105 ${
          isSpinning ? "animate-spin" : ""
        }`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoIceFacet" x1="16" y1="8" x2="48" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="55%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="logoMeltAmber" x1="16" y1="18" x2="48" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Subtle inner glow */}
        <circle
          cx="32"
          cy="38"
          r="18"
          fill="#F59E0B"
          fillOpacity={warmOpacity * 0.28}
        />
        {/* Top Crystalline Ice Crown */}
        <path
          d="M32 9L46 20.5L32 29L18 20.5L32 9Z"
          fill="url(#logoIceFacet)"
        />
        <path
          d="M32 9V29M18 20.5L46 20.5"
          stroke="#BAE6FD"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
        {/* Melting Liquid Vessel */}
        <path
          d="M18 20.5L32 29L46 20.5L47.5 35.5C47.5 44.3366 40.5604 51.5 32 51.5C23.4396 51.5 16.5 44.3366 16.5 35.5L18 20.5Z"
          fill="url(#logoMeltAmber)"
        />
        {/* Inner Warm Hearth Spark */}
        <circle cx="32" cy="39" r="5.5" fill="#FFFBEB" />
        <path
          d="M32 31.5V46.5M24.5 39H39.5"
          stroke="#FEF3C7"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {/* Animated Melting Droplet */}
        <circle
          cx="32"
          cy="55"
          r="2"
          fill="#34D399"
          className="animate-melt-drop"
        />
      </svg>
    </div>
  );
}

export default function UnthawPage() {
  const [presets, setPresets] = useState<PresetScenario[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("capstone-thesis");
  const [rawInput, setRawInput] = useState<string>("");
  const [battery, setBattery] = useState<BatteryLevel>("low");
  const [plan, setPlan] = useState<UnthawPlan | null>(null);
  const [steps, setSteps] = useState<MicroStep[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Theme & Accessibility States
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [blindfoldMode, setBlindfoldMode] = useState<boolean>(true);
  const [dyslexiaMode, setDyslexiaMode] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Interactive Motion & Timer States
  const [secondsLeft, setSecondsLeft] = useState<number>(90);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [splitCount, setSplitCount] = useState<number>(0);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [stepAnimKey, setStepAnimKey] = useState<number>(0);
  const [thawPulse, setThawPulse] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>("");

  const isDark = theme === "dark";

  const applyPlan = useCallback((newPlan: UnthawPlan) => {
    setPlan(newPlan);
    setSteps(newPlan.steps);
    setActiveIndex(0);
    setCompletedIds([]);
    setSplitCount(0);
    const firstDur = newPlan.steps[0]?.durationSeconds ?? 90;
    setSecondsLeft(firstDur);
    setTimerRunning(false);
    setStepAnimKey((k) => k + 1);
    setAnnouncement(
      `Task unthawed into ${newPlan.steps.length} micro-steps. Only Step 1 is shown. ${newPlan.steps[0]?.action || ""}`
    );
  }, []);

  useEffect(() => {
    fetch("/api/unthaw")
      .then((r) => r.json())
      .then((data) => {
        if (data.presets) {
          setPresets(data.presets);
          const first = data.presets[0];
          if (first) {
            setRawInput(first.rawText);
            setBattery(first.battery);
          }
        }
        if (data.plan) {
          applyPlan(data.plan);
        }
      })
      .catch(() => {});
  }, [applyPlan]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const handleUnthaw = async (
    overrideText?: string,
    overrideBattery?: BatteryLevel
  ) => {
    const textToUse = overrideText !== undefined ? overrideText : rawInput;
    const batteryToUse = overrideBattery !== undefined ? overrideBattery : battery;
    if (!textToUse.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/unthaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: textToUse, battery: batteryToUse }),
      });
      const data = await res.json();
      if (data.plan) {
        applyPlan(data.plan);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedPresetId(preset.id);
    setRawInput(preset.rawText);
    setBattery(preset.battery);
    handleUnthaw(preset.rawText, preset.battery);
  };

  const activeStep = steps[activeIndex] || null;
  const allDone = steps.length > 0 && completedIds.length >= steps.length;
  const thawProgress =
    steps.length > 0 ? Math.min(1, completedIds.length / steps.length) : 0;

  // Compute live workspace temperature (-18°C Frozen -> +24°C Flow State)
  const currentTempC = Math.round(-18 + thawProgress * 42);
  const tempLabel =
    currentTempC < -8
      ? "CRYO FREEZE"
      : currentTempC < 10
      ? "THAWING"
      : "WARM FLOW";

  const handleCompleteCurrentStep = useCallback(() => {
    if (!activeStep) return;
    const nextCompleted = Array.from(new Set([...completedIds, activeStep.id]));
    setCompletedIds(nextCompleted);
    setTimerRunning(false);
    setThawPulse(true);
    setTimeout(() => setThawPulse(false), 650);

    if (activeIndex + 1 < steps.length) {
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      setSecondsLeft(steps[nextIdx].durationSeconds);
      setStepAnimKey((k) => k + 1);
      setAnnouncement(
        `Completed step ${activeIndex + 1}. Moving to step ${nextIdx + 1}: ${steps[nextIdx].action}`
      );
    } else {
      setStepAnimKey((k) => k + 1);
      setAnnouncement("All micro-steps completed! You broke through the freeze.");
    }
  }, [activeStep, activeIndex, completedIds, steps]);

  const handleSplitCurrentStep = useCallback(async () => {
    if (!activeStep || !activeStep.canSplit) return;
    const res = await fetch("/api/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: activeStep }),
    });
    const data = await res.json();
    if (data.parts && data.parts.length === 2) {
      const updated = [
        ...steps.slice(0, activeIndex),
        data.parts[0],
        data.parts[1],
        ...steps.slice(activeIndex + 1),
      ].map((s, idx) => ({ ...s, index: idx + 1 }));
      setSteps(updated);
      setSecondsLeft(data.parts[0].durationSeconds);
      setTimerRunning(false);
      setSplitCount((c) => c + 1);
      setStepAnimKey((k) => k + 1);
      setAnnouncement(
        `Cut current step in half. New 60-second starter action: ${data.parts[0].action}`
      );
    }
  }, [activeStep, activeIndex, steps]);

  const handleReadAloud = useCallback(() => {
    if (
      !activeStep ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Step ${activeIndex + 1}. ${activeStep.physicalVerb}. ${activeStep.action}`
    );
    utterance.rate = 0.96;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [activeStep, activeIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setTimerRunning((r) => !r);
      } else if (e.code === "Enter" && !allDone) {
        e.preventDefault();
        handleCompleteCurrentStep();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSplitCurrentStep();
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setBlindfoldMode((b) => !b);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleReadAloud();
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setTheme((t) => (t === "dark" ? "light" : "dark"));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    allDone,
    handleCompleteCurrentStep,
    handleSplitCurrentStep,
    handleReadAloud,
  ]);

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const totalStepSecs = activeStep?.durationSeconds || 90;
  const ringProgress = Math.max(
    0,
    Math.min(1, (totalStepSecs - secondsLeft) / Math.max(1, totalStepSecs))
  );
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ringProgress);
  const hiddenRemainingCount = Math.max(0, steps.length - (activeIndex + 1));

  // Dynamic surface classes for Dark Mode ("Glacial Obsidian") & Light Mode ("Warm Alabaster") + High Contrast
  const rootThemeClass = highContrast
    ? isDark
      ? "bg-black text-white"
      : "bg-white text-black"
    : isDark
    ? "bg-[#070B14] text-slate-100 bg-frost-grid-dark"
    : "bg-[#F6F3EC] text-slate-900 bg-frost-grid-light";

  const cardSurface = highContrast
    ? isDark
      ? "bg-black border-2 border-white"
      : "bg-white border-2 border-black"
    : isDark
    ? "bg-[#0D1424]/85 border border-slate-800/90 shadow-2xl shadow-black/40 backdrop-blur-xl"
    : "bg-white/90 border border-stone-200/90 shadow-xl shadow-stone-900/5 backdrop-blur-xl";

  const subSurface = highContrast
    ? isDark
      ? "bg-neutral-950 border border-white"
      : "bg-neutral-50 border border-black"
    : isDark
    ? "bg-[#111B30]/80 border border-slate-800/80"
    : "bg-[#FAF8F3] border border-stone-200/80";

  const mutedText = highContrast
    ? isDark
      ? "text-neutral-200"
      : "text-neutral-800"
    : isDark
    ? "text-slate-400"
    : "text-stone-600";

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        dyslexiaMode ? "dyslexia-mode" : ""
      } ${rootThemeClass}`}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Floating Pill Command Dock Navbar (Inspired by navbar.gallery) */}
      <header className="sticky top-3 z-30 px-3 sm:px-6 pt-2">
        <nav
          aria-label="Primary Command Dock"
          className={`max-w-6xl mx-auto rounded-2xl px-4 py-2.5 transition-all duration-300 ${
            highContrast
              ? isDark
                ? "bg-black border-2 border-white"
                : "bg-white border-2 border-black"
              : isDark
              ? "bg-[#0B1222]/85 border border-slate-700/60 shadow-2xl shadow-black/50 backdrop-blur-2xl"
              : "bg-white/85 border border-stone-300/80 shadow-lg shadow-stone-900/5 backdrop-blur-2xl"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand Identity + Live Thermal Pill */}
            <div className="flex items-center gap-3.5">
              <UnthawBrandLogo
                thawRatio={0.25 + thawProgress * 0.75}
                isSpinning={loading}
              />
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
                    Unthaw
                  </span>
                  <span
                    className={`font-mono-num text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all duration-500 ${
                      currentTempC < -8
                        ? isDark
                          ? "bg-sky-950/80 text-sky-300 border-sky-700/60"
                          : "bg-sky-50 text-sky-800 border-sky-200"
                        : currentTempC < 10
                        ? isDark
                          ? "bg-amber-950/80 text-amber-300 border-amber-700/60"
                          : "bg-amber-50 text-amber-900 border-amber-300"
                        : isDark
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                        : "bg-emerald-50 text-emerald-900 border-emerald-300"
                    }`}
                  >
                    {currentTempC > 0 ? `+${currentTempC}°C` : `${currentTempC}°C`} ·{" "}
                    {tempLabel}
                  </span>
                </div>
                <p className={`text-xs ${mutedText} hidden sm:block`}>
                  Cryo-to-warmth executive-dysfunction &amp; task-paralysis breaker
                </p>
              </div>
            </div>

            {/* Right Command Dock: Theme Switcher + Accessibility Toggles */}
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="toolbar"
              aria-label="Theme and accessibility controls"
            >
              {/* Dark / Light Mode Toggle Pill */}
              <button
                type="button"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
                title="Shortcut: T — Switch between Glacial Night (Dark) and Warm Alabaster (Light)"
                className={`btn-thermal flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                  isDark
                    ? "bg-slate-800/90 text-amber-300 border-slate-700 hover:border-amber-400/60"
                    : "bg-stone-100 text-slate-900 border-stone-300 hover:border-amber-500"
                }`}
              >
                {isDark ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm9-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm14.071-6.071a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM7.05 16.95a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0Zm12.021 1.414a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414ZM7.05 7.05a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 6.343 4.93l.707.707a1 1 0 0 1 0 1.414ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
                    </svg>
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-sky-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                    </svg>
                    <span>Dark Mode</span>
                  </>
                )}
              </button>

              {/* Blindfold Shield Toggle */}
              <button
                type="button"
                onClick={() => setBlindfoldMode((b) => !b)}
                aria-pressed={blindfoldMode}
                title="Shortcut: B — Hide upcoming steps behind a frost shield so your brain only sees 1 action"
                className={`btn-thermal text-xs px-3 py-1.5 rounded-xl border font-semibold ${
                  blindfoldMode
                    ? "bg-gradient-to-r from-sky-500/20 to-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                    : isDark
                    ? "bg-slate-900 text-slate-300 border-slate-700"
                    : "bg-white text-stone-700 border-stone-300"
                } ${!isDark && blindfoldMode ? "!text-emerald-900 !border-emerald-600" : ""}`}
              >
                {blindfoldMode ? "Blindfold Shield: ON" : "Blindfold Shield: OFF"}
              </button>

              {/* Dyslexia Spacing Toggle */}
              <button
                type="button"
                onClick={() => setDyslexiaMode((d) => !d)}
                aria-pressed={dyslexiaMode}
                className={`btn-thermal text-xs px-3 py-1.5 rounded-xl border font-semibold ${
                  dyslexiaMode
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : isDark
                    ? "bg-slate-900 text-slate-300 border-slate-700"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                Dyslexia: {dyslexiaMode ? "ON" : "OFF"}
              </button>

              {/* High Contrast Toggle */}
              <button
                type="button"
                onClick={() => setHighContrast((c) => !c)}
                aria-pressed={highContrast}
                className={`btn-thermal text-xs px-3 py-1.5 rounded-xl border font-semibold ${
                  highContrast
                    ? isDark
                      ? "bg-white text-black border-white"
                      : "bg-black text-white border-black"
                    : isDark
                    ? "bg-slate-900 text-slate-300 border-slate-700"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                AAA Contrast: {highContrast ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-14 space-y-7">
        {/* Editorial Hero Header + Live Thermal Melt Bar (Inspired by Land-book & Deck.gallery) */}
        <section className={`rounded-3xl p-6 sm:p-8 relative overflow-hidden ${cardSurface}`}>
          {/* Decorative Ambient Aura */}
          {!highContrast && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-sky-500/20 via-amber-500/20 to-emerald-500/20 blur-3xl animate-pulse-glow"
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            <div className="lg:col-span-7 space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className={!isDark ? "text-amber-900" : ""}>
                  Executive-Dysfunction &amp; Task-Paralysis Breaker
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl tracking-tight leading-[1.08]">
                Every freeze melts{" "}
                <span className="italic bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
                  one micro-step
                </span>{" "}
                at a time.
              </h1>

              <p className={`text-sm sm:text-base max-w-2xl leading-relaxed ${mutedText}`}>
                Standard to-do lists show 15 unfinished obligations at once and lock your nervous system in sub-zero avoidance.{" "}
                <strong className={isDark ? "text-white" : "text-slate-900"}>Unthaw</strong> tucks the backlog behind a frosted{" "}
                <strong className={isDark ? "text-sky-300" : "text-sky-700"}>Blindfold Shield</strong> and hands you a single{" "}
                <strong className={isDark ? "text-amber-300" : "text-amber-800"}>90-second physical starter action</strong>.
              </p>
            </div>

            {/* Live Cryo-to-Warmth Telemetry Module */}
            <div className={`lg:col-span-5 rounded-2xl p-4 sm:p-5 space-y-3 ${subSurface}`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="uppercase tracking-wider text-sky-400">
                  Cryo Freeze (-18°C)
                </span>
                <span className="font-mono-num font-bold text-amber-400">
                  {Math.round(thawProgress * 100)}% Thawed
                </span>
                <span className="uppercase tracking-wider text-emerald-400">
                  Flow (+24°C)
                </span>
              </div>

              {/* Animated Thermal Gradient Bar */}
              <div className="w-full h-3.5 rounded-full bg-slate-900/70 p-0.5 overflow-hidden border border-slate-700/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(12, Math.round(thawProgress * 100))}%` }}
                />
              </div>

              {plan && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="rounded-xl p-2 bg-sky-500/10 border border-sky-500/20">
                    <div className="font-mono-num font-bold text-base text-sky-400">
                      {plan.metrics.intimidationScoreBefore}/100
                    </div>
                    <div className={`text-[11px] ${mutedText}`}>Raw Freeze</div>
                  </div>
                  <div className="rounded-xl p-2 bg-amber-500/10 border border-amber-500/20">
                    <div className="font-mono-num font-bold text-base text-amber-400">
                      {steps[0]?.durationSeconds ?? 90}s
                    </div>
                    <div className={`text-[11px] ${mutedText}`}>First Step</div>
                  </div>
                  <div className="rounded-xl p-2 bg-emerald-500/10 border border-emerald-500/20">
                    <div className="font-mono-num font-bold text-base text-emerald-400">
                      -{plan.metrics.frictionReductionPercent}%
                    </div>
                    <div className={`text-[11px] ${mutedText}`}>Friction Drop</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bento Strip: 4 Real-World Overwhelming Scenarios (Inspired by Posts.design) */}
        <section aria-label="Sample overwhelming scenarios" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              01 · Choose a Frozen Scenario (or paste your own below)
            </h2>
            <div className={`text-xs ${mutedText} flex flex-wrap items-center gap-1.5`}>
              <span>Shortcuts:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-num text-[11px]">
                Space
              </kbd>
              <span>timer</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-num text-[11px]">
                Enter
              </kbd>
              <span>done</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-num text-[11px]">
                S
              </kbd>
              <span>split 50%</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-num text-[11px]">
                R
              </kbd>
              <span>voice</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-num text-[11px]">
                T
              </kbd>
              <span>theme</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {presets.map((p, idx) => {
              const active = selectedPresetId === p.id;
              const accentBadges = [
                "from-sky-500/20 to-indigo-500/20 border-sky-400/50",
                "from-amber-500/20 to-orange-500/20 border-amber-400/50",
                "from-emerald-500/20 to-teal-500/20 border-emerald-400/50",
                "from-purple-500/20 to-pink-500/20 border-purple-400/50",
              ];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`btn-thermal text-left p-4 rounded-2xl transition-all flex flex-col justify-between ${
                    active
                      ? `bg-gradient-to-br ${accentBadges[idx % 4]} border-2 shadow-lg`
                      : `${cardSurface} hover:border-amber-400/50`
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {p.barrierTag}
                      </span>
                      <span className="font-mono-num text-[11px] font-bold uppercase text-amber-400">
                        {p.battery}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm leading-snug">{p.label}</h3>
                  </div>
                  <p className={`text-xs mt-2 line-clamp-2 ${mutedText}`}>
                    {p.persona}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main 2-Column Interactive Studio: Left = Cryo Input & Battery | Right = Blindfold Focus Tunnel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Frozen Task Input + Cognitive Battery */}
          <section className={`lg:col-span-5 rounded-3xl p-6 space-y-5 ${cardSurface}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">
                  02 · Frozen Input
                </span>
                <h2 className="font-bold text-lg">Dump What Is Freezing You</h2>
              </div>
              {plan && (
                <span className="font-mono-num text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Freeze: {plan.metrics.intimidationScoreBefore}/100
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="raw-task-input"
                className={`block text-xs mb-2 ${mutedText}`}
              >
                Paste an intimidating syllabus prompt, bug report, or multi-part backlog:
              </label>
              <textarea
                id="raw-task-input"
                rows={4}
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  setSelectedPresetId("custom");
                }}
                placeholder="e.g., Write 12-page capstone paper on distributed consensus by Friday including 15 citations, benchmarks, and architecture diagrams..."
                className={`w-full rounded-2xl p-3.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-400 ${subSurface}`}
              />
            </div>

            {/* Cognitive Battery Level Picker */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-amber-400">
                03 · Select Your Cognitive Battery
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      id: "low",
                      title: "Low Battery",
                      sub: "90s–2m steps",
                      badge: "Frozen",
                      dot: "bg-sky-400",
                    },
                    {
                      id: "steady",
                      title: "Steady",
                      sub: "5m momentum",
                      badge: "Warming",
                      dot: "bg-amber-400",
                    },
                    {
                      id: "deep",
                      title: "Deep Flow",
                      sub: "10m sprints",
                      badge: "Charged",
                      dot: "bg-emerald-400",
                    },
                  ] as const
                ).map((b) => {
                  const selected = battery === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBattery(b.id);
                        handleUnthaw(rawInput, b.id);
                      }}
                      className={`btn-thermal p-3 rounded-2xl border text-left transition-all ${
                        selected
                          ? "bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border-amber-400 shadow-md"
                          : `${subSurface} hover:border-slate-600`
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${b.dot}`} />
                        <span className="font-mono-num text-[11px] font-bold uppercase text-amber-400">
                          {b.badge}
                        </span>
                      </div>
                      <div className="font-bold text-xs mt-1">{b.title}</div>
                      <div className={`text-[11px] ${mutedText}`}>{b.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Thermal CTA Button */}
            <button
              type="button"
              onClick={() => handleUnthaw()}
              disabled={loading || !rawInput.trim()}
              className="btn-thermal w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
              <span>
                {loading
                  ? "Melting Freeze Into Micro-Steps…"
                  : "Unthaw Into Single 90s Micro-Step"}
              </span>
            </button>

            {/* Detected Cognitive Freeze Triggers */}
            {plan && (
              <div className={`rounded-2xl p-4 space-y-2.5 ${subSurface}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-sky-400">
                    Why Your Brain Froze (Detected Triggers)
                  </span>
                  <span className="font-mono-num text-emerald-400">
                    -{plan.metrics.frictionReductionPercent}% Friction
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {plan.metrics.cognitiveHazardsFound.map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Right Column: Center-Stage Blindfold Focus Tunnel */}
          <section
            aria-label="Active micro-step focus tunnel"
            className={`lg:col-span-7 rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all duration-500 ${cardSurface} ${
              thawPulse ? "ring-4 ring-amber-400/70 scale-[1.005]" : ""
            }`}
          >
            {/* Top Status Strip */}
            {plan && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono-num text-xs uppercase tracking-widest font-bold text-emerald-400">
                      {blindfoldMode
                        ? `Blindfold Focus Tunnel · Step ${Math.min(
                            activeIndex + 1,
                            steps.length
                          )} of ${steps.length}`
                        : `Full Sequence View · ${completedIds.length}/${steps.length} Melted`}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${mutedText}`}>{plan.calmReframe}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono-num text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Melted: {completedIds.length}/{steps.length}
                  </span>
                  {splitCount > 0 && (
                    <span className="font-mono-num text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ⚡ Split {splitCount}× smaller
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Active Micro-Step Stage */}
            {!allDone && activeStep ? (
              <div key={stepAnimKey} className="space-y-6 animate-card-reveal">
                <div
                  className={`rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden ${subSurface}`}
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm">
                        DO ONLY THIS NOW · {activeStep.physicalVerb}
                      </span>
                      <span className="font-mono-num text-xs px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {activeStep.durationSeconds}s activation window
                      </span>
                    </div>

                    <h3 className="font-display text-2xl sm:text-4xl leading-[1.15] tracking-tight pt-1">
                      {activeStep.action}
                    </h3>

                    <p className={`text-xs sm:text-sm italic ${mutedText}`}>
                      Why this melts the freeze: {activeStep.whyItWorks}
                    </p>
                  </div>

                  {/* Animated Thermal Countdown Ring */}
                  <div className="flex flex-col items-center shrink-0 self-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                        <defs>
                          <linearGradient
                            id="thermalRingGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#10B981" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke={isDark ? "#1E293B" : "#E7E5E4"}
                          strokeWidth="8"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke="url(#thermalRingGrad)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono-num font-extrabold text-2xl tracking-tight">
                          {formatClock(secondsLeft)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest ${
                            timerRunning ? "text-amber-400 animate-pulse" : mutedText
                          }`}
                        >
                          {timerRunning ? "Melting…" : "Ready"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTimerRunning((r) => !r)}
                      className={`btn-thermal mt-2.5 text-xs font-bold px-3.5 py-1.5 rounded-xl border ${
                        timerRunning
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : isDark
                          ? "bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400"
                          : "bg-white text-slate-900 border-stone-300 hover:border-amber-500"
                      }`}
                    >
                      {timerRunning ? "Pause Timer (Space)" : "Start Timer (Space)"}
                    </button>
                  </div>
                </div>

                {/* Tactile Motion Action Deck */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <button
                    type="button"
                    onClick={handleCompleteCurrentStep}
                    className="btn-thermal sm:col-span-7 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Done — Melt &amp; Reveal Next Step (Enter)</span>
                  </button>

                  <div className="sm:col-span-5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSplitCurrentStep}
                      disabled={!activeStep.canSplit}
                      className="btn-thermal py-2.5 px-4 rounded-xl border border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>⚡ Still Too Scary? Split in Half (S)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReadAloud}
                      className={`btn-thermal py-2 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        speaking
                          ? "border-sky-400 bg-sky-500/20 text-sky-300"
                          : isDark
                          ? "border-slate-700 bg-slate-900/90 text-slate-300"
                          : "border-stone-300 bg-white text-slate-800"
                      }`}
                    >
                      <span>{speaking ? "Speaking Step Aloud…" : "🔊 Read Step Aloud (R)"}</span>
                    </button>
                  </div>
                </div>

                {/* Frosted Blindfold Shield OR Full Queue */}
                {blindfoldMode ? (
                  <div
                    className={`rounded-2xl p-4 border border-dashed flex flex-wrap items-center justify-between gap-3 ${
                      isDark
                        ? "border-sky-500/40 bg-sky-950/25"
                        : "border-sky-600/40 bg-sky-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                        ❄️
                      </div>
                      <div>
                        <p className="text-xs font-bold">
                          Cryo Blindfold Shield Active: {hiddenRemainingCount} upcoming micro-step
                          {hiddenRemainingCount === 1 ? "" : "s"} safely hidden behind frost
                        </p>
                        <p className={`text-xs ${mutedText}`}>
                          Your working memory only has to hold Step {activeIndex + 1} right now.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlindfoldMode(false)}
                      className="btn-thermal text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/40"
                    >
                      Peek Through Frost ({steps.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                        All Micro-Steps in Sequence
                      </span>
                      <button
                        type="button"
                        onClick={() => setBlindfoldMode(true)}
                        className="text-xs underline text-amber-400 font-semibold"
                      >
                        Re-enable Blindfold Shield
                      </button>
                    </div>
                    {steps.map((s, idx) => {
                      const done = completedIds.includes(s.id);
                      const isCurrent = idx === activeIndex;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveIndex(idx);
                            setSecondsLeft(s.durationSeconds);
                            setTimerRunning(false);
                          }}
                          className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                            done
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 line-through opacity-75"
                              : isCurrent
                              ? "bg-amber-500/15 border-amber-400 font-bold"
                              : subSurface
                          }`}
                        >
                          <div>
                            <span className="font-mono-num font-bold mr-2 text-amber-400">
                              #{idx + 1}
                            </span>
                            <span>{s.action}</span>
                          </div>
                          <span className="font-mono-num shrink-0 text-sky-400">
                            {s.durationSeconds}s
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              allDone && (
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 via-amber-500/15 to-sky-500/20 border-2 border-emerald-400/60 p-8 text-center space-y-4 animate-card-reveal">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 text-slate-950 font-extrabold text-3xl shadow-lg shadow-emerald-500/30">
                    ☀
                  </div>
                  <h3 className="font-display text-3xl sm:text-4xl text-emerald-400">
                    Full Thaw Achieved — All {steps.length} Micro-Steps Complete!
                  </h3>
                  <p className={`text-sm max-w-md mx-auto ${mutedText}`}>
                    You melted an intimidating wall of work (Freeze Score{" "}
                    {plan?.metrics.intimidationScoreBefore}/100) into +24°C active momentum.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedIds([]);
                      setActiveIndex(0);
                      setSecondsLeft(steps[0]?.durationSeconds ?? 90);
                    }}
                    className="btn-thermal px-5 py-2.5 rounded-xl bg-emerald-400 text-slate-950 text-xs font-extrabold"
                  >
                    Reset &amp; Thaw Another Task
                  </button>
                </div>
              )
            )}
          </section>
        </div>

        {/* Before vs. After Impact Receipt (Inspired by OGImage.gallery & Deck.gallery) */}
        {plan && (
          <section
            aria-label="Before and after impact comparison"
            className={`rounded-3xl p-6 sm:p-8 space-y-5 ${cardSurface}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  04 · Measurable Transformation Receipt
                </span>
                <h2 className="font-display text-2xl sm:text-3xl mt-0.5">
                  Before vs. After Impact Receipt
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono-num text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                  BEFORE: {plan.metrics.intimidationScoreBefore}/100 Freeze
                </span>
                <span className="text-amber-400 font-bold">→</span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-extrabold">
                  AFTER: {plan.metrics.intimidationScoreAfter}/100 (-
                  {plan.metrics.frictionReductionPercent}% Friction)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* BEFORE: Frozen Monolith */}
              <div className="rounded-2xl border border-rose-500/35 bg-rose-950/15 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                    ❄️ BEFORE · Raw Frozen Backlog (-18°C)
                  </span>
                  <span className="font-mono-num text-xs text-rose-300">
                    {plan.metrics.rawItemCount} tangled obligations visible at once
                  </span>
                </div>
                <p
                  className={`text-xs p-3.5 rounded-xl font-mono-num leading-relaxed ${subSurface}`}
                >
                  {plan.rawInput}
                </p>
                <p className={`text-xs ${mutedText}`}>
                  <strong className="text-rose-400">The Productivity Barrier:</strong>{" "}
                  Seeing multi-hour deliverables and high-volume quotas all at once triggers executive-dysfunction freeze and avoidance.
                </p>
              </div>

              {/* AFTER: Melted 90s Micro-Drop */}
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/15 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    ☀️ AFTER · Unthaw Blindfold Step #1 (+24°C)
                  </span>
                  <span className="font-mono-num text-xs text-emerald-300">
                    {steps[0]?.durationSeconds ?? 90}s physical ignition
                  </span>
                </div>
                <p
                  className={`text-xs p-3.5 rounded-xl font-semibold leading-relaxed ${subSurface}`}
                >
                  {steps[0]?.action}
                </p>
                <p className={`text-xs ${mutedText}`}>
                  <strong className="text-emerald-400">The Meaningful Change:</strong>{" "}
                  All other {Math.max(0, steps.length - 1)} steps stay hidden behind the Cryo Blindfold Shield until Step 1 is complete, and any step can be split in half into a 60s physical setup action.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
