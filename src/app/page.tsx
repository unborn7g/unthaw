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
    <div className="relative inline-flex items-center justify-center w-11 h-11 rounded-2xl p-[1.5px] bg-gradient-to-br from-sky-400 via-amber-400 to-emerald-400 shadow-lg shadow-amber-500/15 group">
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

  // Calm Single-Stage View Switcher controlled by the bottom dock
  const [activeView, setActiveView] = useState<StudioView>("focus");

  // Theme & Accessibility States
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [blindfoldMode, setBlindfoldMode] = useState<boolean>(true);
  const [dyslexiaMode, setDyslexiaMode] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Interactive Motion & Timer States (Timer always starts paused until user taps Start)
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
        `Cut current step in half. New starter action: ${data.parts[0].action}`
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

      {/* Top Header Bar with Brand Identity + Tactile Sliding Moon/Sun Toggle */}
      <header className="sticky top-5 z-30 px-4 sm:px-8">
        <div
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
            <div className="flex items-center gap-3.5">
              <UnthawBrandLogo
                thawRatio={0.25 + thawProgress * 0.75}
                isSpinning={loading}
              />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
                Unthaw
              </span>
              <span
                className={`font-mono-num text-xs font-semibold px-3.5 py-1 rounded-full border transition-all duration-500 ${
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

            {/* Right Controls: Dyslexia, High contrast + Tactile Sliding Moon/Sun Switch */}
            <div
              className="flex items-center gap-2.5"
              role="toolbar"
              aria-label="Theme and accessibility controls"
            >
              <button
                type="button"
                onClick={() => setDyslexiaMode((d) => !d)}
                aria-pressed={dyslexiaMode}
                className={`btn-thermal text-xs px-3.5 py-2 rounded-full border font-semibold ${
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
                className={`btn-thermal text-xs px-3.5 py-2 rounded-full border font-semibold ${
                  highContrast
                    ? isDark
                      ? "bg-white text-black border-white"
                      : "bg-black text-white border-black"
                    : isDark
                    ? "bg-slate-900/90 text-slate-300 border-white/10"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                High contrast: {highContrast ? "ON" : "OFF"}
              </button>

              {/* Tactile Sliding Pill Track Switch with Metallic Rim Knob & Moon/Sun Icon */}
              <button
                type="button"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
                title={`Current: ${
                  isDark ? "Dark Mode" : "Light Mode"
                } (Press T to toggle)`}
                className={`relative inline-flex items-center w-[72px] h-10 rounded-full p-1 transition-colors duration-300 border shadow-inner cursor-pointer ${
                  isDark
                    ? "bg-[#222834] border-white/15"
                    : "bg-stone-200 border-stone-300"
                }`}
              >
                <span className="sr-only">
                  {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </span>
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ease-out shadow-md ${
                    isDark
                      ? "translate-x-8 bg-[#07090E] border border-white/35 text-white"
                      : "translate-x-0 bg-white border border-amber-400/80 text-amber-500"
                  }`}
                >
                  {isDark ? (
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Center Breathing Workspace — Generous Negative Space, Zero Overlap With Bottom Dock */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-5 sm:px-8 pt-8 pb-8 space-y-8">
        {/* Breathable Editorial Hero Title + Bigger Scenario Pills */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="font-display text-4xl sm:text-6xl tracking-tight leading-[1.06]">
            Every freeze melts{" "}
            <span className="italic bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              one micro-step
            </span>{" "}
            at a time.
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto ${mutedText}`}>
            Your brain does not need 15 checkboxes right now. Everything else is tucked safely out of sight—just do this single physical action.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {presets.map((p) => {
              const active = selectedPresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`btn-thermal text-sm sm:text-[15px] px-5 py-2.5 sm:px-6 sm:py-3 rounded-full transition-all ${
                    active
                      ? isDark
                        ? "bg-amber-400/20 text-amber-300 border-2 border-amber-400/70 font-bold shadow-lg shadow-amber-500/10"
                        : "bg-amber-500/15 text-amber-900 border-2 border-amber-500/60 font-bold shadow-md"
                      : isDark
                      ? "bg-white/[0.04] text-slate-300 border border-white/[0.09] hover:border-white/25 hover:text-white font-medium"
                      : "bg-stone-200/70 text-stone-700 border border-stone-300/80 hover:text-stone-950 font-medium"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveView("compose")}
              className={`btn-thermal text-sm sm:text-[15px] px-5 py-2.5 sm:px-6 sm:py-3 rounded-full border-2 border-dashed font-semibold ${
                isDark
                  ? "border-sky-400/50 text-sky-300 hover:bg-sky-400/15"
                  : "border-sky-600/50 text-sky-800 hover:bg-sky-50"
              }`}
            >
              + Paste Your Own Task
            </button>
          </div>
        </div>

        {/* STAGE 1: ZEN FOCUS TUNNEL */}
        {activeView === "focus" && (
          <section
            aria-label="Active micro-step focus tunnel"
            className={`rounded-[32px] p-7 sm:p-10 relative overflow-hidden transition-all duration-500 ${mainStageSurface} ${
              thawPulse ? "ring-2 ring-amber-400/70 scale-[1.005]" : ""
            }`}
          >
            {!highContrast && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 rounded-full bg-gradient-to-br from-sky-500/15 via-amber-500/15 to-emerald-500/15 blur-3xl animate-pulse-glow"
              />
            )}

            {/* Top Minimal Progress Line */}
            {plan && (
              <div className="space-y-3.5 mb-8 relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono-num text-xs sm:text-sm uppercase tracking-widest font-bold text-emerald-400">
                      Step {Math.min(activeIndex + 1, steps.length)} of{" "}
                      {steps.length}
                    </span>
                    <span className={`text-xs sm:text-sm ${mutedText}`}>
                      · {battery.toUpperCase()} BATTERY
                    </span>
                    {splitCount > 0 && (
                      <span className="font-mono-num text-xs sm:text-sm text-amber-400 font-bold">
                        · Split {splitCount}× smaller
                      </span>
                    )}
                  </div>

                  {/* Quick Battery Switcher Pills */}
                  <div className="flex items-center gap-2">
                    {(["low", "steady", "deep"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setBattery(b);
                          handleUnthaw(rawInput, b, false);
                        }}
                        className={`text-xs font-mono-num uppercase px-3.5 py-1.5 rounded-full transition ${
                          battery === b
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold"
                            : `${mutedText} hover:text-current`
                        }`}
                      >
                        {b === "low" ? "2m Low" : b === "steady" ? "5m Steady" : "10m Deep"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delicate Thermal Progress Line */}
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(
                        10,
                        Math.round(
                          ((activeIndex + (allDone ? 1 : 0.25)) /
                            Math.max(1, steps.length)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Main Single Action Content — Short Imperative Sans Headline + Small Task Subline */}
            {!allDone && activeStep ? (
              <div
                key={stepAnimKey}
                className="space-y-8 relative z-10 animate-card-reveal"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                  <div className="space-y-3.5 flex-1">
                    <div className="inline-flex items-center gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950">
                        {activeStep.physicalVerb}
                      </span>
                      <span className={`font-mono-num text-xs sm:text-sm ${mutedText}`}>
                        {activeStep.durationSeconds} seconds
                      </span>
                    </div>

                    {/* Change 1 & 2: Short (<8 words) imperative headline, sans font, loosened letter-spacing */}
                    <h2 className="step-text-sans font-sans font-bold text-3xl sm:text-4xl leading-snug tracking-wide">
                      {activeStep.action}
                    </h2>

                    {/* Change 1: Show task name as a small subline */}
                    <p
                      className={`step-text-sans font-sans text-xs sm:text-sm font-medium tracking-wide ${
                        isDark ? "text-sky-300/90" : "text-sky-800"
                      }`}
                    >
                      Task: {activeStep.sourceClause}
                    </p>

                    <p
                      className={`step-text-sans font-sans text-sm sm:text-base leading-relaxed tracking-wide max-w-xl ${mutedText}`}
                    >
                      {activeStep.whyItWorks}
                    </p>
                  </div>

                  {/* Change 4: Timer starts paused; user taps Start */}
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
                          stroke={
                            isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                          }
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
                          className="mt-2 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-xs font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-400/30 transition"
                        >
                          {timerRunning ? "Pause" : "Start"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacious Action Row */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07]">
                  <button
                    type="button"
                    onClick={handleCompleteCurrentStep}
                    className="btn-thermal py-4 px-8 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/20 flex items-center gap-2.5"
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

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSplitCurrentStep}
                      disabled={!activeStep.canSplit}
                      className="btn-thermal py-3.5 px-6 rounded-full border border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20 disabled:opacity-40 text-amber-300 font-semibold text-xs sm:text-sm"
                    >
                      ⚡ Still Too Scary? Split in Half (S)
                    </button>

                    <button
                      type="button"
                      onClick={handleReadAloud}
                      className={`btn-thermal py-3.5 px-5 rounded-full border text-xs sm:text-sm font-semibold ${
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm pt-1">
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
                    className="text-sky-400 hover:underline font-semibold"
                  >
                    {blindfoldMode
                      ? `Peek at all ${steps.length} steps (B)`
                      : "Hide upcoming steps (B)"}
                  </button>
                </div>

                {!blindfoldMode && (
                  <div className="space-y-2.5 pt-3">
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
                          className={`step-text-sans font-sans tracking-wide px-5 py-3.5 rounded-2xl text-xs sm:text-sm cursor-pointer transition flex items-center justify-between gap-3 ${
                            done
                              ? "opacity-50 line-through"
                              : isCurrent
                              ? "bg-amber-400/15 border border-amber-400/40 font-semibold"
                              : "bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <span>
                            <strong className="font-mono-num mr-2.5 text-amber-400">
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
                  <h2 className="step-text-sans font-sans font-bold text-3xl sm:text-4xl tracking-wide text-emerald-400">
                    Full Thaw Achieved — All {steps.length} Steps Complete!
                  </h2>
                  <p className={`text-base max-w-md mx-auto ${mutedText}`}>
                    You turned an intimidating backlog (
                    {plan?.metrics.intimidationScoreBefore}/100 Freeze) into
                    +24°C active momentum.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedIds([]);
                        setActiveIndex(0);
                        setSecondsLeft(steps[0]?.durationSeconds ?? 90);
                        setTimerRunning(false);
                      }}
                      className="btn-thermal px-6 py-3 rounded-full bg-emerald-400 text-slate-950 text-sm font-extrabold"
                    >
                      Restart Sequence
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("receipt")}
                      className="btn-thermal px-6 py-3 rounded-full border border-white/15 text-sm font-semibold"
                    >
                      View Before vs. After Receipt
                    </button>
                  </div>
                </div>
              )
            )}
          </section>
        )}

        {/* STAGE 2: SPACIOUS TASK COMPOSER */}
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
                className={`text-xs sm:text-sm underline ${mutedText}`}
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
              className="btn-thermal w-full py-4 px-6 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/20"
            >
              {loading
                ? "Melting Into Micro-Steps…"
                : "Unthaw & Enter Focus Tunnel →"}
            </button>
          </section>
        )}

        {/* STAGE 3: BEFORE VS. AFTER IMPACT RECEIPT */}
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

              <div className="flex items-center gap-3 font-mono-num text-xs sm:text-sm">
                <span className="px-4 py-1.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                  Before: {plan.metrics.intimidationScoreBefore}/100 Freeze
                </span>
                <span className="text-amber-400">→</span>
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-extrabold">
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
                <div
                  className={`step-text-sans font-sans tracking-wide text-sm p-5 rounded-2xl space-y-1.5 ${
                    isDark
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  <p className="font-bold text-base">{steps[0]?.action}</p>
                  <p className={`text-xs ${mutedText}`}>
                    Task: {steps[0]?.sourceClause}
                  </p>
                </div>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  All other {Math.max(0, steps.length - 1)} steps stay tucked
                  behind the Blindfold Shield until Step 1 is done.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Change 3: Bottom Dock in dedicated non-overlapping footer lane with clear text labels */}
      <footer className="w-full pt-4 pb-6 px-4 flex justify-center shrink-0">
        <nav
          aria-label="Workspace Bottom Dock"
          className={`inline-flex items-center gap-7 sm:gap-11 px-8 sm:px-12 py-3.5 rounded-full transition-all duration-300 ${
            highContrast
              ? isDark
                ? "bg-black border-2 border-white"
                : "bg-white border-2 border-black"
              : isDark
              ? "bg-[#0B1322]/95 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
              : "bg-white/95 border border-stone-300/90 shadow-[0_16px_40px_rgba(0,0,0,0.12)] backdrop-blur-2xl"
          }`}
        >
          {/* Dock Item 1: TUNNEL */}
          <button
            type="button"
            onClick={() => setActiveView("focus")}
            className={`group flex flex-col items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 ${
              activeView === "focus"
                ? isDark
                  ? "text-sky-300"
                  : "text-sky-700"
                : isDark
                ? "text-slate-300 hover:text-white"
                : "text-stone-600 hover:text-stone-950"
            }`}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="4" rx="1.5" />
              <rect x="14" y="11" width="7" height="10" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span className="text-xs font-bold tracking-[0.12em] uppercase">
              TUNNEL
            </span>
          </button>

          {/* Dock Item 2: UNTHAW */}
          <button
            type="button"
            onClick={() => setActiveView("compose")}
            className={`group flex flex-col items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 ${
              activeView === "compose"
                ? isDark
                  ? "text-amber-300"
                  : "text-amber-700"
                : isDark
                ? "text-slate-300 hover:text-white"
                : "text-stone-600 hover:text-stone-950"
            }`}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-xs font-bold tracking-[0.12em] uppercase">
              UNTHAW
            </span>
          </button>

          {/* Dock Item 3: SHIELD ON / OFF */}
          <button
            type="button"
            onClick={() => {
              setBlindfoldMode((b) => !b);
              setActiveView("focus");
            }}
            aria-pressed={blindfoldMode}
            className={`group flex flex-col items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 ${
              blindfoldMode
                ? isDark
                  ? "text-emerald-300"
                  : "text-emerald-700"
                : isDark
                ? "text-slate-300 hover:text-white"
                : "text-stone-600 hover:text-stone-950"
            }`}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="11" width="16" height="10" rx="2.5" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span className="text-xs font-bold tracking-[0.12em] uppercase">
              {blindfoldMode ? "SHIELD ON" : "SHIELD OFF"}
            </span>
          </button>

          {/* Dock Item 4: IMPACT */}
          <button
            type="button"
            onClick={() => setActiveView("receipt")}
            className={`group flex flex-col items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 ${
              activeView === "receipt"
                ? isDark
                  ? "text-emerald-300"
                  : "text-emerald-700"
                : isDark
                ? "text-slate-300 hover:text-white"
                : "text-stone-600 hover:text-stone-950"
            }`}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-xs font-bold tracking-[0.12em] uppercase">
              IMPACT
            </span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
