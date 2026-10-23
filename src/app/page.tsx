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
    <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-2xl p-[1.5px] bg-gradient-to-br from-sky-400 via-amber-400 to-emerald-400 shadow-lg shadow-amber-500/15 group">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`w-full h-full rounded-[14px] bg-[#0B1220] transition-transform duration-500 group-hover:scale-105 ${
          isSpinning ? "animate-spin" : ""
        }`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="logoIceFacet"
            x1="16"
            y1="8"
            x2="48"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="55%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient
            id="logoMeltAmber"
            x1="16"
            y1="18"
            x2="48"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <circle
          cx="32"
          cy="38"
          r="18"
          fill="#F59E0B"
          fillOpacity={warmOpacity * 0.28}
        />
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
        <path
          d="M18 20.5L32 29L46 20.5L47.5 35.5C47.5 44.3366 40.5604 51.5 32 51.5C23.4396 51.5 16.5 44.3366 16.5 35.5L18 20.5Z"
          fill="url(#logoMeltAmber)"
        />
        <circle cx="32" cy="39" r="5.5" fill="#FFFBEB" />
        <path
          d="M32 31.5V46.5M24.5 39H39.5"
          stroke="#FEF3C7"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
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

type StudioView = "focus" | "compose" | "receipt";

export default function UnthawPage() {
  const [presets, setPresets] = useState<PresetScenario[]>([]);
  const [selectedPresetId, setSelectedPresetId] =
    useState<string>("capstone-thesis");
  const [rawInput, setRawInput] = useState<string>("");
  const [battery, setBattery] = useState<BatteryLevel>("low");
  const [plan, setPlan] = useState<UnthawPlan | null>(null);
  const [steps, setSteps] = useState<MicroStep[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Calm Single-Stage View Switcher (eliminates 15 boxes crammed on one screen)
  const [activeView, setActiveView] = useState<StudioView>("focus");

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
      `Task unthawed into ${newPlan.steps.length} micro-steps. Only Step 1 is shown. ${
        newPlan.steps[0]?.action || ""
      }`
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
    overrideBattery?: BatteryLevel,
    switchToFocus = true
  ) => {
    const textToUse = overrideText !== undefined ? overrideText : rawInput;
    const batteryToUse =
      overrideBattery !== undefined ? overrideBattery : battery;
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
        if (switchToFocus) {
          setActiveView("focus");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedPresetId(preset.id);
    setRawInput(preset.rawText);
    setBattery(preset.battery);
    handleUnthaw(preset.rawText, preset.battery, true);
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
        `Completed step ${activeIndex + 1}. Moving to step ${nextIdx + 1}: ${
          steps[nextIdx].action
        }`
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
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ringProgress);
  const hiddenRemainingCount = Math.max(0, steps.length - (activeIndex + 1));

  // Theme surfaces with generous breathing space and delicate borders
  const rootThemeClass = highContrast
    ? isDark
      ? "bg-black text-white"
      : "bg-white text-black"
    : isDark
    ? "bg-[#070B14] text-slate-100 bg-frost-grid-dark"
    : "bg-[#F6F3EC] text-slate-900 bg-frost-grid-light";

  const mainStageSurface = highContrast
    ? isDark
      ? "bg-black border-2 border-white"
      : "bg-white border-2 border-black"
    : isDark
    ? "bg-[#0C1323]/75 border border-white/[0.07] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
    : "bg-white/85 border border-stone-200/80 shadow-[0_24px_60px_-15px_rgba(28,25,23,0.07)] backdrop-blur-2xl";

  const mutedText = highContrast
    ? isDark
      ? "text-neutral-200"
      : "text-neutral-800"
    : isDark
    ? "text-slate-400"
    : "text-stone-600";

  return (
    <div
      className={`min-h-screen transition-colors duration-500 flex flex-col justify-between ${
        dyslexiaMode ? "dyslexia-mode" : ""
      } ${rootThemeClass}`}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Floating Minimal Command Dock Navbar */}
      <header className="sticky top-5 z-30 px-4 sm:px-8">
        <nav
          aria-label="Primary Command Dock"
          className={`max-w-5xl mx-auto rounded-full px-5 py-2.5 transition-all duration-300 ${
            highContrast
              ? isDark
                ? "bg-black border-2 border-white"
                : "bg-white border-2 border-black"
              : isDark
              ? "bg-[#0B1222]/80 border border-white/[0.08] shadow-2xl shadow-black/50 backdrop-blur-2xl"
              : "bg-white/85 border border-stone-300/70 shadow-lg shadow-stone-900/5 backdrop-blur-2xl"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Brand Identity + Live Thermal Pill */}
            <div className="flex items-center gap-3">
              <UnthawBrandLogo
                thawRatio={0.25 + thawProgress * 0.75}
                isSpinning={loading}
              />
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
                Unthaw
              </span>
              <span
                className={`font-mono-num text-[11px] font-semibold px-3 py-1 rounded-full border transition-all duration-500 ${
                  currentTempC < -8
                    ? isDark
                      ? "bg-sky-950/60 text-sky-300 border-sky-500/30"
                      : "bg-sky-50 text-sky-800 border-sky-200"
                    : currentTempC < 10
                    ? isDark
                      ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                      : "bg-amber-50 text-amber-900 border-amber-300"
                    : isDark
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                    : "bg-emerald-50 text-emerald-900 border-emerald-300"
                }`}
              >
                {currentTempC > 0 ? `+${currentTempC}°C` : `${currentTempC}°C`} ·{" "}
                {tempLabel}
              </span>
            </div>

            {/* Center View Navigation Pills (Only 1 Stage on Screen at a Time) */}
            <div
              className={`inline-flex items-center p-1 rounded-full ${
                isDark ? "bg-slate-900/90" : "bg-stone-200/70"
              }`}
              role="tablist"
              aria-label="Workspace Stage"
            >
              {[
                { id: "focus", label: "1. Focus Tunnel" },
                { id: "compose", label: "2. Change Task" },
                {
                  id: "receipt",
                  label: `3. Impact (-${plan?.metrics.frictionReductionPercent ?? 82}%)`,
                },
              ].map((tab) => {
                const active = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveView(tab.id as StudioView)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? "bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 text-slate-950 shadow-sm font-bold"
                        : `${mutedText} hover:text-current`
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Right Accessibility & Theme Controls */}
            <div
              className="flex items-center gap-1.5"
              role="toolbar"
              aria-label="Theme and accessibility controls"
            >
              <button
                type="button"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
                title="Shortcut: T — Switch between Dark and Light mode"
                className={`btn-thermal flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  isDark
                    ? "bg-slate-900/90 text-amber-300 border-white/10"
                    : "bg-stone-100 text-slate-900 border-stone-300"
                }`}
              >
                <span>{isDark ? "☀ Light Mode" : "☾ Dark Mode"}</span>
              </button>

              <button
                type="button"
                onClick={() => setDyslexiaMode((d) => !d)}
                aria-pressed={dyslexiaMode}
                className={`btn-thermal text-xs px-3 py-1.5 rounded-full border font-semibold ${
                  dyslexiaMode
                    ? "bg-amber-400 text-slate-950 border-amber-400"
                    : isDark
                    ? "bg-slate-900/90 text-slate-300 border-white/10"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                Dyslexia: {dyslexiaMode ? "ON" : "OFF"}
              </button>

              <button
                type="button"
                onClick={() => setHighContrast((c) => !c)}
                aria-pressed={highContrast}
                className={`btn-thermal text-xs px-3 py-1.5 rounded-full border font-semibold ${
                  highContrast
                    ? isDark
                      ? "bg-white text-black border-white"
                      : "bg-black text-white border-black"
                    : isDark
                    ? "bg-slate-900/90 text-slate-300 border-white/10"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                AAA: {highContrast ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Center Breathing Workspace — Generous Negative Space, One Focal Canvas */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-10">
        {/* Breathable Editorial Hero Title */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="font-display text-4xl sm:text-6xl tracking-tight leading-[1.06]">
            Every freeze melts{" "}
            <span className="italic bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              one micro-step
            </span>{" "}
            at a time.
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed ${mutedText}`}>
            Your brain does not need 15 checkboxes right now. Everything else is tucked safely out of sight—just do this single physical action.
          </p>

          {/* Lightweight Scenario Switcher Pills (Zero Cluttered Boxes) */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {presets.map((p) => {
              const active = selectedPresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`btn-thermal text-xs px-3.5 py-1.5 rounded-full transition-all ${
                    active
                      ? isDark
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 font-semibold"
                        : "bg-amber-500/15 text-amber-900 border border-amber-500/40 font-semibold"
                      : isDark
                      ? "bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-slate-200"
                      : "bg-stone-200/60 text-stone-600 border border-stone-300/60 hover:text-stone-900"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveView("compose")}
              className={`btn-thermal text-xs px-3.5 py-1.5 rounded-full border border-dashed ${
                isDark
                  ? "border-sky-400/40 text-sky-300 hover:bg-sky-400/10"
                  : "border-sky-600/40 text-sky-800 hover:bg-sky-50"
              }`}
            >
              + Paste Your Own Task
            </button>
          </div>
        </div>

        {/* STAGE 1: ZEN FOCUS TUNNEL (Default Single-Card Sanctuary) */}
        {activeView === "focus" && (
          <section
            aria-label="Active micro-step focus tunnel"
            className={`rounded-[32px] p-8 sm:p-12 relative overflow-hidden transition-all duration-500 ${mainStageSurface} ${
              thawPulse ? "ring-2 ring-amber-400/70 scale-[1.005]" : ""
            }`}
          >
            {/* Subtle Ambient Glow Inside the Sanctuary */}
            {!highContrast && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 rounded-full bg-gradient-to-br from-sky-500/15 via-amber-500/15 to-emerald-500/15 blur-3xl animate-pulse-glow"
              />
            )}

            {/* Top Minimal Progress Line */}
            {plan && (
              <div className="space-y-4 mb-10 relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono-num text-xs uppercase tracking-widest font-bold text-emerald-400">
                      Step {Math.min(activeIndex + 1, steps.length)} of{" "}
                      {steps.length}
                    </span>
                    <span className={`text-xs ${mutedText}`}>
                      · {battery.toUpperCase()} BATTERY
                    </span>
                    {splitCount > 0 && (
                      <span className="font-mono-num text-xs text-amber-400">
                        · Split {splitCount}× smaller
                      </span>
                    )}
                  </div>

                  {/* Quick Battery Switcher Pills */}
                  <div className="flex items-center gap-1.5">
                    {(["low", "steady", "deep"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setBattery(b);
                          handleUnthaw(rawInput, b, false);
                        }}
                        className={`text-[11px] font-mono-num uppercase px-2.5 py-1 rounded-full transition ${
                          battery === b
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold"
                            : `${mutedText} hover:text-current`
                        }`}
                      >
                        {b === "low" ? "2m Low" : b === "steady" ? "5m Steady" : "10m Deep"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delicate 2px Thermal Progress Line */}
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(
                        10,
                        Math.round(((activeIndex + (allDone ? 1 : 0.25)) / Math.max(1, steps.length)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Main Single Action Content — Open, Unboxed, Breathable */}
            {!allDone && activeStep ? (
              <div
                key={stepAnimKey}
                className="space-y-10 relative z-10 animate-card-reveal"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
                  <div className="space-y-4 flex-1">
                    <div className="inline-flex items-center gap-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950">
                        {activeStep.physicalVerb}
                      </span>
                      <span className={`font-mono-num text-xs ${mutedText}`}>
                        {activeStep.durationSeconds} seconds
                      </span>
                    </div>

                    <h2 className="font-display text-3xl sm:text-5xl leading-[1.14] tracking-tight">
                      {activeStep.action}
                    </h2>

                    <p className={`text-sm leading-relaxed max-w-xl ${mutedText}`}>
                      {activeStep.whyItWorks}
                    </p>
                  </div>

                  {/* Breathable Floating Countdown Ring */}
                  <div className="flex flex-col items-center shrink-0 self-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
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
                          cx="64"
                          cy="64"
                          r={radius}
                          fill="none"
                          stroke={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}
                          strokeWidth="6"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          fill="none"
                          stroke="url(#thermalRingGrad)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono-num font-bold text-3xl tracking-tight">
                          {formatClock(secondsLeft)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTimerRunning((r) => !r)}
                          className="mt-1 text-[11px] font-bold uppercase tracking-widest text-amber-400 hover:underline"
                        >
                          {timerRunning ? "Pause (Space)" : "Start (Space)"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacious Action Row (No Stacked Cramped Boxes) */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07]">
                  <button
                    type="button"
                    onClick={handleCompleteCurrentStep}
                    className="btn-thermal py-4 px-8 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2.5"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Done — Melt Next Micro-Step (Enter)</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSplitCurrentStep}
                      disabled={!activeStep.canSplit}
                      className="btn-thermal py-3 px-5 rounded-full border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 disabled:opacity-40 text-amber-300 font-semibold text-xs"
                    >
                      ⚡ Still Too Scary? Split in Half (S)
                    </button>

                    <button
                      type="button"
                      onClick={handleReadAloud}
                      className={`btn-thermal py-3 px-4 rounded-full border text-xs font-semibold ${
                        speaking
                          ? "border-sky-400 bg-sky-500/20 text-sky-300"
                          : isDark
                          ? "border-white/10 bg-white/[0.04] text-slate-300"
                          : "border-stone-300 bg-stone-100 text-slate-800"
                      }`}
                    >
                      {speaking ? "Speaking…" : "🔊 Read Aloud (R)"}
                    </button>
                  </div>
                </div>

                {/* Whisper-Quiet Blindfold Footer Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <span className={mutedText}>
                    {blindfoldMode
                      ? `❄️ Blindfold Shield active — ${hiddenRemainingCount} remaining micro-step${
                          hiddenRemainingCount === 1 ? "" : "s"
                        } hidden so your mind can rest.`
                      : `Showing all ${steps.length} steps below.`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBlindfoldMode((b) => !b)}
                    className="text-sky-400 hover:underline font-medium"
                  >
                    {blindfoldMode
                      ? `Peek at all ${steps.length} steps (B)`
                      : "Hide upcoming steps (B)"}
                  </button>
                </div>

                {!blindfoldMode && (
                  <div className="space-y-2 pt-3">
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
                          className={`px-4 py-3 rounded-2xl text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                            done
                              ? "opacity-50 line-through"
                              : isCurrent
                              ? "bg-amber-400/15 border border-amber-400/40 font-semibold"
                              : "bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <span>
                            <strong className="font-mono-num mr-2 text-amber-400">
                              0{idx + 1}
                            </strong>
                            {s.action}
                          </span>
                          <span className="font-mono-num text-sky-400 shrink-0">
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
                <div className="py-10 text-center space-y-5 animate-card-reveal">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-emerald-400 text-slate-950 font-extrabold text-3xl shadow-lg shadow-emerald-500/30">
                    ☀
                  </div>
                  <h2 className="font-display text-4xl sm:text-5xl text-emerald-400">
                    Full Thaw Achieved — All {steps.length} Steps Complete!
                  </h2>
                  <p className={`text-base max-w-md mx-auto ${mutedText}`}>
                    You turned an intimidating backlog ({plan?.metrics.intimidationScoreBefore}
                    /100 Freeze) into +24°C active momentum.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedIds([]);
                        setActiveIndex(0);
                        setSecondsLeft(steps[0]?.durationSeconds ?? 90);
                      }}
                      className="btn-thermal px-6 py-3 rounded-full bg-emerald-400 text-slate-950 text-xs font-extrabold"
                    >
                      Restart Sequence
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("receipt")}
                      className="btn-thermal px-6 py-3 rounded-full border border-white/15 text-xs font-semibold"
                    >
                      View Before vs. After Receipt
                    </button>
                  </div>
                </div>
              )
            )}
          </section>
        )}

        {/* STAGE 2: SPACIOUS TASK COMPOSER (When Changing or Pasting a Custom Task) */}
        {activeView === "compose" && (
          <section
            aria-label="Task composer and battery selector"
            className={`rounded-[32px] p-8 sm:p-12 space-y-8 animate-card-reveal ${mainStageSurface}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Dump What Is Freezing You
                </span>
                <h2 className="font-display text-3xl sm:text-4xl mt-1">
                  Paste any overwhelming assignment or backlog
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("focus")}
                className={`text-xs underline ${mutedText}`}
              >
                ← Back to Focus Tunnel
              </button>
            </div>

            <textarea
              id="raw-task-input"
              rows={4}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setSelectedPresetId("custom");
              }}
              placeholder="e.g., Write 12-page capstone paper on distributed consensus by Friday including 15 citations, benchmarks, and architecture diagrams..."
              className={`w-full rounded-3xl p-5 text-base leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                isDark
                  ? "bg-white/[0.04] border border-white/10 text-slate-100"
                  : "bg-stone-100/80 border border-stone-300 text-slate-900"
              }`}
            />

            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-widest text-amber-400">
                Select Your Current Cognitive Battery
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(
                  [
                    {
                      id: "low",
                      title: "Low Battery (Frozen)",
                      sub: "90s–2m gentle starter micro-steps",
                    },
                    {
                      id: "steady",
                      title: "Steady Battery",
                      sub: "5-minute momentum steps",
                    },
                    {
                      id: "deep",
                      title: "Deep Flow",
                      sub: "10-minute focus sprints",
                    },
                  ] as const
                ).map((b) => {
                  const selected = battery === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBattery(b.id)}
                      className={`btn-thermal p-5 rounded-2xl border text-left transition-all ${
                        selected
                          ? "bg-amber-400/15 border-amber-400"
                          : isDark
                          ? "bg-white/[0.03] border-white/10"
                          : "bg-stone-100/70 border-stone-300"
                      }`}
                    >
                      <div className="font-bold text-sm">{b.title}</div>
                      <div className={`text-xs mt-1 ${mutedText}`}>{b.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleUnthaw(rawInput, battery, true)}
              disabled={loading || !rawInput.trim()}
              className="btn-thermal w-full py-4 px-6 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20"
            >
              {loading
                ? "Melting Into Micro-Steps…"
                : "Unthaw & Enter Focus Tunnel →"}
            </button>
          </section>
        )}

        {/* STAGE 3: BEFORE VS. AFTER IMPACT RECEIPT (Dedicated Clean View) */}
        {activeView === "receipt" && plan && (
          <section
            aria-label="Before and after impact comparison"
            className={`rounded-[32px] p-8 sm:p-12 space-y-8 animate-card-reveal ${mainStageSurface}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Measurable Workflow Change
                </span>
                <h2 className="font-display text-3xl sm:text-4xl mt-1">
                  Before vs. After Impact Receipt
                </h2>
              </div>

              <div className="flex items-center gap-3 font-mono-num text-xs">
                <span className="px-3.5 py-1.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                  Before: {plan.metrics.intimidationScoreBefore}/100 Freeze
                </span>
                <span className="text-amber-400">→</span>
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-extrabold">
                  After: {plan.metrics.intimidationScoreAfter}/100 (-
                  {plan.metrics.frictionReductionPercent}% Friction)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  ❄️ BEFORE · Raw Frozen Backlog (-18°C)
                </span>
                <p
                  className={`text-sm p-5 rounded-2xl leading-relaxed ${
                    isDark ? "bg-white/[0.04]" : "bg-stone-100"
                  }`}
                >
                  {plan.rawInput}
                </p>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {plan.metrics.rawItemCount} obligations stacked together trigger:{" "}
                  {plan.metrics.cognitiveHazardsFound.join(" · ")}.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  ☀️ AFTER · Single Blindfold Micro-Step (+24°C)
                </span>
                <p
                  className={`text-sm p-5 rounded-2xl font-semibold leading-relaxed ${
                    isDark
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  {steps[0]?.action}
                </p>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  All other {Math.max(0, steps.length - 1)} steps stay tucked behind the Blindfold Shield until Step 1 is done.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Whisper-Quiet Keyboard Hint Footer */}
      <footer className={`text-center pb-6 text-xs ${mutedText}`}>
        Keyboard: <span className="font-mono-num">Space</span> timer ·{" "}
        <span className="font-mono-num">Enter</span> complete step ·{" "}
        <span className="font-mono-num">S</span> split in half ·{" "}
        <span className="font-mono-num">B</span> blindfold shield ·{" "}
        <span className="font-mono-num">R</span> read aloud ·{" "}
        <span className="font-mono-num">T</span> dark/light mode
      </footer>
    </div>
  );
}
