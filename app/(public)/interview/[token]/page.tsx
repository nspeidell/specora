"use client";

import { useState, useEffect, use, useMemo } from "react";
import {
  DISCOVERY_QUESTIONS,
  getVisibleQuestions,
  type DiscoveryQuestion,
} from "@/lib/discovery/questions";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

type Answers = Record<string, string | string[]>;

type LinkState = {
  projectName: string;
  clientName?: string;
  status: string;
  existingAnswers: Record<string, string>;
};

// ── Question Input ────────────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: DiscoveryQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const strVal = typeof value === "string" ? value : "";
  const arrVal = Array.isArray(value) ? value : [];

  const baseInput =
    "w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 text-white placeholder:text-white/30 text-lg outline-none transition-colors pb-3 pt-1 caret-white";
  const baseArea =
    "w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 text-white placeholder:text-white/30 text-base outline-none transition-colors pb-3 pt-1 resize-none caret-white leading-relaxed";

  if (question.type === "textarea") {
    return (
      <textarea
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={4}
        className={baseArea}
        autoFocus
      />
    );
  }

  if (question.type === "text") {
    return (
      <input
        type="text"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        className={baseInput}
        autoFocus
      />
    );
  }

  if (question.type === "select") {
    return (
      <div className="space-y-2 mt-2">
        {question.options?.map((opt) => {
          const selected = strVal === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all duration-150 ${
                selected
                  ? "border-white/50 bg-white/10 text-white"
                  : "border-white/12 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              {opt.hint && (
                <div className="text-xs opacity-50 mt-0.5">{opt.hint}</div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "multiselect") {
    return (
      <div className="space-y-2 mt-2">
        {question.options?.map((opt) => {
          const selected = arrVal.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const next = selected
                  ? arrVal.filter((v) => v !== opt.value)
                  : [...arrVal, opt.value];
                onChange(next);
              }}
              className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all duration-150 ${
                selected
                  ? "border-white/50 bg-white/10 text-white"
                  : "border-white/12 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              {opt.hint && (
                <div className="text-xs opacity-50 mt-0.5">{opt.hint}</div>
              )}
            </button>
          );
        })}
        <p className="text-white/25 text-xs pt-1 pl-1">Select all that apply</p>
      </div>
    );
  }

  if (question.type === "boolean") {
    return (
      <div className="flex gap-3 mt-2">
        {["Yes", "No"].map((label) => {
          const val = label === "Yes" ? "true" : "false";
          const selected = strVal === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={`flex-1 py-4 rounded-xl border text-base font-medium transition-all ${
                selected
                  ? "border-white/50 bg-white/10 text-white"
                  : "border-white/12 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

// ── Main Page ─────────────────────────────────────────────────

export default function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [linkState, setLinkState] = useState<LinkState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [visibleIndex, setVisibleIndex] = useState(0); // index into visibleQuestions
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // Recompute visible questions every time answers change
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(answers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(answers)]
  );

  const question = visibleQuestions[visibleIndex];
  const currentAnswer = question ? answers[question.key] : undefined;
  const isLast = visibleIndex === visibleQuestions.length - 1;
  const progress = visibleQuestions.length
    ? ((visibleIndex + 1) / visibleQuestions.length) * 100
    : 0;

  // Load link state on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/interview/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setLoadError(
            (body as { error?: string }).error ||
              "This discovery link is unavailable or has expired."
          );
          return;
        }
        const data = (await res.json()) as LinkState;
        setLinkState(data);

        if (data.status === "completed") {
          setCompleted(true);
          return;
        }

        if (data.existingAnswers && Object.keys(data.existingAnswers).length > 0) {
          const restored: Answers = { ...data.existingAnswers };
          setAnswers(restored);

          // Fast-forward to first unanswered visible question
          const answeredKeys = new Set(Object.keys(data.existingAnswers));
          const visible = getVisibleQuestions(restored);
          const firstUnanswered = visible.findIndex(
            (q) => !answeredKeys.has(q.key)
          );
          if (firstUnanswered > 0) {
            setVisibleIndex(firstUnanswered);
          }
        }
      } catch {
        setLoadError("Failed to load. Please refresh and try again.");
      }
    }
    load();
  }, [token]);

  async function saveAndAdvance() {
    if (!question) return;

    const val = currentAnswer;
    const isEmpty =
      !val || (Array.isArray(val) ? val.length === 0 : val.trim() === "");

    if (question.required && isEmpty) {
      setSaveError("Please answer this question before continuing.");
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/interview/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionKey: question.key,
          questionText: question.question,
          responseText: Array.isArray(val) ? val.join(", ") : val ?? "",
          stepNumber: question.step,
          isLast,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(
          (body as { error?: string }).error || "Failed to save. Please try again."
        );
        return;
      }

      if (isLast) {
        setCompleted(true);
      } else {
        setVisibleIndex((i) => i + 1);
      }
    } catch {
      setSaveError("Network error. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (visibleIndex > 0) {
      setSaveError(null);
      setVisibleIndex((i) => i - 1);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      question?.type !== "textarea" &&
      question?.type !== "multiselect"
    ) {
      e.preventDefault();
      saveAndAdvance();
    }
  }

  // ── States ────────────────────────────────────────────────

  if (!linkState && !loadError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <p className="text-white/35 text-sm text-center max-w-sm">{loadError}</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full border border-white/12 flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-7 h-7 text-white/70" />
          </div>
          <h1 className="text-2xl font-light text-white mb-3">
            You&rsquo;re done.
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">
            Your responses have been received. The team will review them and
            build out a technical plan. No further action needed.
          </p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  // ── Interview ─────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col"
      onKeyDown={handleKey}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-px bg-white/6 z-10">
        <div
          className="h-full bg-white/35 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 pt-5 pb-3 z-10">
        <span className="text-white/25 text-xs font-medium tracking-wider uppercase">
          {linkState?.projectName}
        </span>
        <span className="text-white/20 text-xs tabular-nums">
          {visibleIndex + 1} / {visibleQuestions.length}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-24 max-w-2xl mx-auto w-full">
        {/* Category */}
        <div className="text-white/25 text-[11px] font-semibold uppercase tracking-[0.12em] mb-5">
          {question.category}
        </div>

        {/* Question */}
        <h1 className="text-2xl md:text-3xl font-light leading-snug text-white mb-3">
          {question.question}
        </h1>

        {question.subtext && (
          <p className="text-white/35 text-sm leading-relaxed mb-8">
            {question.subtext}
          </p>
        )}

        {!question.subtext && <div className="mb-8" />}

        {/* Input */}
        <QuestionInput
          question={question}
          value={currentAnswer}
          onChange={(val) => {
            setAnswers((prev) => ({ ...prev, [question.key]: val }));
            setSaveError(null);
          }}
        />

        {/* Error */}
        {saveError && (
          <p className="text-red-400/70 text-xs mt-4">{saveError}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={goBack}
            disabled={visibleIndex === 0}
            className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors text-sm disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <button
            type="button"
            onClick={saveAndAdvance}
            disabled={saving}
            className="flex items-center gap-2 px-7 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/92 active:bg-white/85 transition-all disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLast ? (
              <>
                Submit
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {!question.required && (
          <p className="text-center text-white/18 text-xs mt-5">
            Optional — press Continue to skip
          </p>
        )}
      </div>
    </div>
  );
}
