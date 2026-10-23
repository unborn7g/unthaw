"use client";

import React, { useEffect, useState, useCallback } from "react";
import type {
  BatteryLevel,
  MicroStep,
  PresetScenario,
  UnthawPlan,
} from "@/lib/unthaw-engine";

export default function UnthawPage() {
  const [presets, setPresets] = useState<PresetScenario[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("capstone-thesis");
  const [rawInput, setRawInput] = useState<string>("");
  const [battery, setBattery] = useState<BatteryLevel>("low");
  const [plan, setPlan] = useState<UnthawPlan | null>(null);
  const [steps, setSteps] = useState<MicroStep[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [blindfoldMode, setBlindfoldMode] = useState<boolean>(true);
  const [dyslexiaMode, setDyslexiaMode] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(90);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [splitCount, setSplitCount] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string>("");

  const applyPlan = useCallback((newPlan: UnthawPlan) => {
    setPlan(newPlan);
    setSteps(newPlan.steps);
    setActiveIndex(0);
    setCompletedIds([]);
    setSplitCount(0);
    const firstDur = newPlan.steps[0]?.durationSeconds ?? 90;
    setSecondsLeft(firstDur);
    setTimerRunning(false);
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

  const handleUnthaw = async (overrideText?: string, overrideBattery?: BatteryLevel) => {
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

  const handleCompleteCurrentStep = useCallback(() => {
    if (!activeStep) return;
    const nextCompleted = Array.from(new Set([...completedIds, activeStep.id]));
    setCompletedIds(nextCompleted);
    setTimerRunning(false);

    if (activeIndex + 1 < steps.length) {
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      setSecondsLeft(steps[nextIdx].durationSeconds);
      setAnnouncement(`Completed step ${activeIndex + 1}. Moving to step ${nextIdx + 1}: ${steps[nextIdx].action}`);
    } else {
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
      setAnnouncement(
        `Cut current step in half. New 60-second starter action: ${data.parts[0].action}`
      );
    }
  }, [activeStep, activeIndex, steps]);

  const handleReadAloud = useCallback(() => {
    if (!activeStep || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Step ${activeIndex + 1}. ${activeStep.physicalVerb}. ${activeStep.action}`
    );
    utterance.rate = 0.95;
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
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allDone, handleCompleteCurrentStep, handleSplitCurrentStep, handleReadAloud]);

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
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - ringProgress);
  const hiddenRemainingCount = Math.max(0, steps.length - (activeIndex + 1));

  return (
    <div
      className={`min-h-screen transition-colors ${
        dyslexiaMode ? "dyslexia-mode" : ""
      } ${highContrast ? "high-contrast-mode bg-white text-black" : "bg-[#fbf9f4] text-[#171715]"}`}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Top Header & Accessibility Bar */}
      <header className="border-b border-[#e4dfd3] bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#1d5c42] text-white font-bold text-lg shadow-sm">
              U
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">Unthaw</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-[#1d5c42] border border-emerald-200 font-medium">
                  Taskforge Prototype
                </span>
              </div>
              <p className="text-xs text-[#57554f]">
                Every freeze melts one micro-step at a time · Executive-dysfunction &amp; task-paralysis breaker
              </p>
            </div>
          </div>

          {/* Accessibility Controls */}
          <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Accessibility controls">
            <button
              type="button"
              onClick={() => setBlindfoldMode((b) => !b)}
              aria-pressed={blindfoldMode}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition ${
                blindfoldMode
                  ? "bg-[#1d5c42] text-white border-[#1d5c42]"
                  : "bg-white text-[#171715] border-[#d5cfc2] hover:bg-stone-50"
              }`}
              title="Shortcut: B — Hide upcoming steps so the full backlog cannot overwhelm you"
            >
              {blindfoldMode ? "Blindfold Mode: ON (B)" : "Blindfold Mode: OFF (B)"}
            </button>

            <button
              type="button"
              onClick={() => setDyslexiaMode((d) => !d)}
              aria-pressed={dyslexiaMode}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition ${
                dyslexiaMode
                  ? "bg-amber-900 text-white border-amber-900"
                  : "bg-white text-[#171715] border-[#d5cfc2] hover:bg-stone-50"
              }`}
            >
              Dyslexia Spacing: {dyslexiaMode ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={() => setHighContrast((c) => !c)}
              aria-pressed={highContrast}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition ${
                highContrast
                  ? "bg-black text-white border-black"
                  : "bg-white text-[#171715] border-[#d5cfc2] hover:bg-stone-50"
              }`}
            >
              High Contrast: {highContrast ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Preset Selector Strip */}
        <section
          aria-label="Sample overwhelming scenarios"
          className="bg-white rounded-xl border border-[#e4dfd3] p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57554f]">
                1. Pick an Overwhelming Scenario (or paste your own below)
              </h2>
            </div>
            <span className="text-xs text-[#57554f]">
              Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">Space</kbd> timer ·{" "}
              <kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">Enter</kbd> done ·{" "}
              <kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">S</kbd> split step in half ·{" "}
              <kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">R</kbd> read aloud
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {presets.map((p) => {
              const active = selectedPresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-left p-3 rounded-lg border transition flex flex-col justify-between ${
                    active
                      ? "border-[#1d5c42] bg-emerald-50/60 ring-1 ring-[#1d5c42]"
                      : "border-[#e4dfd3] hover:border-stone-400 bg-[#fbf9f4]/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-200/80 text-stone-800">
                        {p.barrierTag}
                      </span>
                      <span className="text-[11px] font-mono text-[#1d5c42] font-semibold">
                        {p.battery.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#171715] mt-1">{p.label}</p>
                  </div>
                  <p className="text-xs text-[#57554f] mt-1.5 line-clamp-2">{p.persona}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main 2-Column Workspace: Left = Input & Battery | Right = Blindfold Focus Tunnel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Overwhelming Input + Cognitive Battery */}
          <section className="lg:col-span-5 bg-white rounded-xl border border-[#e4dfd3] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">
                2. Dump What Is Freezing You
              </h2>
              {plan && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">
                  Raw Intimidation: {plan.metrics.intimidationScoreBefore}/100
                </span>
              )}
            </div>

            <div>
              <label htmlFor="raw-task-input" className="block text-xs text-[#57554f] mb-1.5">
                Paste a scary assignment, messy to-do list, syllabus block, or group-project handoff:
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
                className="w-full rounded-lg border border-[#d5cfc2] bg-[#fbf9f4] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d5c42]"
              />
            </div>

            {/* Cognitive Battery Level Picker */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#57554f] mb-2">
                3. Select Your Current Cognitive Battery
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: "low",
                      title: "Low Battery",
                      sub: "90s–2m micro-steps",
                      badge: "Frozen / Tired",
                    },
                    {
                      id: "steady",
                      title: "Steady",
                      sub: "5m momentum steps",
                      badge: "Normal",
                    },
                    {
                      id: "deep",
                      title: "Deep Flow",
                      sub: "10m focus blocks",
                      badge: "Ready",
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
                      className={`p-2.5 rounded-lg border text-left transition ${
                        selected
                          ? "border-[#1d5c42] bg-emerald-50/80 ring-1 ring-[#1d5c42]"
                          : "border-[#e4dfd3] bg-[#fbf9f4]/50 hover:bg-stone-100/70"
                      }`}
                    >
                      <div className="text-[11px] font-mono text-[#1d5c42] font-semibold">
                        {b.badge}
                      </div>
                      <div className="font-bold text-xs mt-0.5">{b.title}</div>
                      <div className="text-[11px] text-[#57554f]">{b.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleUnthaw()}
              disabled={loading || !rawInput.trim()}
              className="w-full py-3 px-4 rounded-lg bg-[#1d5c42] hover:bg-[#164934] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
            >
              {loading ? "Unthawing into micro-steps…" : "Unthaw Into Single Micro-Step"}
            </button>

            {/* Cognitive Hazards Detected */}
            {plan && (
              <div className="rounded-lg bg-[#fbf9f4] border border-[#e4dfd3] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#57554f]">
                  <span>Why Your Brain Froze (Detected Triggers)</span>
                  <span className="font-mono text-emerald-800">
                    -{plan.metrics.frictionReductionPercent}% friction
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-[#171715]">
                  {plan.metrics.cognitiveHazardsFound.map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
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
            className="lg:col-span-7 bg-white rounded-xl border-2 border-[#1d5c42] p-6 shadow-md space-y-5"
          >
            {plan && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4dfd3] pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#1d5c42] font-semibold">
                    {blindfoldMode
                      ? `Blindfold Focus Tunnel · Step ${Math.min(activeIndex + 1, steps.length)} of ${steps.length}`
                      : `Full Sequence View · ${completedIds.length}/${steps.length} Done`}
                  </span>
                  <p className="text-xs text-[#57554f] mt-0.5">{plan.calmReframe}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-[#1d5c42] border border-emerald-200 font-semibold">
                    Done: {completedIds.length}/{steps.length}
                  </span>
                  {splitCount > 0 && (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      Split {splitCount}x smaller
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Active Single Step Card */}
            {!allDone && activeStep ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#fbf9f4] rounded-xl p-5 border border-[#e4dfd3]">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#1d5c42] text-white">
                        ONLY DO THIS NOW · {activeStep.physicalVerb}
                      </span>
                      <span className="text-xs font-mono text-[#57554f]">
                        Target: {Math.round(activeStep.durationSeconds / 60)} min (
                        {activeStep.durationSeconds}s)
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold leading-snug text-[#171715] pt-1">
                      {activeStep.action}
                    </h3>

                    <p className="text-xs text-[#57554f] italic">
                      Why this melts the freeze: {activeStep.whyItWorks}
                    </p>
                  </div>

                  {/* Tactile SVG Countdown Ring */}
                  <div className="flex flex-col items-center shrink-0 self-center">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="#e4dfd3"
                          strokeWidth="7"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="#c26318"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono font-bold text-xl">
                          {formatClock(secondsLeft)}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[#57554f]">
                          {timerRunning ? "Running" : "Ready"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTimerRunning((r) => !r)}
                      className="mt-2 text-xs font-semibold px-3 py-1 rounded-md border border-[#d5cfc2] bg-white hover:bg-stone-100"
                    >
                      {timerRunning ? "Pause Timer (Space)" : "Start Timer (Space)"}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleCompleteCurrentStep}
                    className="sm:col-span-2 py-3.5 px-5 rounded-xl bg-[#1d5c42] hover:bg-[#164934] text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Done — Reveal Next Micro-Step (Enter)</span>
                  </button>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSplitCurrentStep}
                      disabled={!activeStep.canSplit}
                      className="py-2 px-3 rounded-lg border border-amber-400 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-950 font-semibold text-xs transition"
                    >
                      Still Too Scary? Split in Half (S)
                    </button>
                    <button
                      type="button"
                      onClick={handleReadAloud}
                      className="py-1.5 px-3 rounded-lg border border-[#d5cfc2] bg-white hover:bg-stone-50 text-xs font-medium transition"
                    >
                      Read Step Aloud (R)
                    </button>
                  </div>
                </div>

                {/* Blindfold Curtain OR Full Step List */}
                {blindfoldMode ? (
                  <div className="rounded-xl border border-dashed border-[#d5cfc2] bg-[#fbf9f4] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#171715]">
                        Blindfold Shield Active: {hiddenRemainingCount} remaining micro-step
                        {hiddenRemainingCount === 1 ? "" : "s"} tucked out of sight
                      </p>
                      <p className="text-xs text-[#57554f]">
                        Hiding the rest of the list prevents executive-dysfunction overload while you do Step{" "}
                        {activeIndex + 1}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlindfoldMode(false)}
                      className="text-xs underline text-[#1d5c42] font-medium shrink-0 ml-3"
                    >
                      Peek at all ({steps.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#57554f]">
                      All Micro-Steps in Queue
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
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                            done
                              ? "bg-emerald-50/50 border-emerald-200 text-[#57554f] line-through"
                              : isCurrent
                              ? "bg-amber-50/70 border-[#c26318] font-semibold"
                              : "bg-[#fbf9f4] border-[#e4dfd3]"
                          }`}
                        >
                          <div>
                            <span className="font-mono font-bold mr-2">#{idx + 1}</span>
                            <span>{s.action}</span>
                          </div>
                          <span className="font-mono shrink-0">
                            {Math.round(s.durationSeconds / 60)}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              allDone && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-6 text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1d5c42] text-white font-bold text-xl">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-[#1d5c42]">
                    Freeze Broken — All {steps.length} Micro-Steps Complete!
                  </h3>
                  <p className="text-sm text-[#171715] max-w-md mx-auto">
                    You turned an intimidating wall of work (Intimidation Score{" "}
                    {plan?.metrics.intimidationScoreBefore}/100) into completed physical momentum.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedIds([]);
                      setActiveIndex(0);
                      setSecondsLeft(steps[0]?.durationSeconds ?? 90);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1d5c42] text-white text-xs font-semibold"
                  >
                    Restart Sequence
                  </button>
                </div>
              )
            )}
          </section>
        </div>

        {/* Before vs. After Impact Receipt (Required by Taskforge Rubric) */}
        {plan && (
          <section
            aria-label="Before and after impact comparison"
            className="bg-white rounded-xl border border-[#e4dfd3] p-5 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-base">
                  4. Before vs. After Impact Receipt (How Unthaw Changes the Workflow)
                </h2>
                <p className="text-xs text-[#57554f]">
                  Quantifies why traditional to-do lists trigger task paralysis and how single-step blindfolding restores agency.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-red-50 text-red-800 border border-red-200">
                  Before: {plan.metrics.intimidationScoreBefore}/100 Intimidation
                </span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-[#1d5c42] border border-emerald-200 font-bold">
                  After: {plan.metrics.intimidationScoreAfter}/100 Intimidation (-
                  {plan.metrics.frictionReductionPercent}%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BEFORE box */}
              <div className="rounded-lg border border-red-200 bg-red-50/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-900">
                    BEFORE (Standard To-Do List / Raw Assignment)
                  </span>
                  <span className="text-xs font-mono text-red-800">
                    {plan.metrics.rawItemCount} tangled obligations visible at once
                  </span>
                </div>
                <p className="text-xs text-[#171715] bg-white/80 p-3 rounded border border-red-100 font-mono leading-relaxed">
                  {plan.rawInput}
                </p>
                <p className="text-xs text-red-900">
                  <strong>Barrier:</strong> Brain sees a multi-hour outcome with no clear 90-second physical starting point, triggering avoidance and doomscrolling.
                </p>
              </div>

              {/* AFTER box */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1d5c42]">
                    AFTER (Unthaw Blindfold Micro-Step #1)
                  </span>
                  <span className="text-xs font-mono text-[#1d5c42]">
                    {steps[0]?.durationSeconds ?? 90}s activation energy
                  </span>
                </div>
                <p className="text-xs text-[#171715] bg-white p-3 rounded border border-emerald-200 font-semibold leading-relaxed">
                  {steps[0]?.action}
                </p>
                <p className="text-xs text-[#1d5c42]">
                  <strong>Meaningful Change:</strong> All other { Math.max(0, steps.length - 1) } steps are hidden behind Blindfold Mode until Step 1 is done, and any step can be halved into a 60s physical setup action.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
