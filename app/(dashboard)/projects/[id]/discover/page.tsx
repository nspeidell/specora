"use client";

import { useState, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getVisibleQuestions,
  type DiscoveryQuestion,
} from "@/lib/discovery/questions";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Zap,
} from "lucide-react";

type Answers = Record<string, string | string[]>;

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

  if (question.type === "textarea") {
    return (
      <textarea
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={5}
        className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition resize-none"
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
        className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition"
      />
    );
  }

  if (question.type === "select") {
    return (
      <div className="space-y-2">
        {question.options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
              strVal === opt.value
                ? "border-brand bg-brand/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
            }`}
          >
            <span className="font-medium text-foreground">{opt.label}</span>
            {opt.hint && (
              <span className="block text-xs text-muted-foreground mt-0.5">
                {opt.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multiselect") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {question.options?.map((opt) => {
          const selected = arrVal.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (selected) {
                  onChange(arrVal.filter((v) => v !== opt.value));
                } else {
                  onChange([...arrVal, opt.value]);
                }
              }}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                selected
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                    selected ? "bg-brand border-brand" : "border-border"
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 text-white fill-current">
                      <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

export default function DiscoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(answers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(answers)]
  );

  const question = visibleQuestions[visibleIndex] ?? visibleQuestions[0];
  const currentAnswer = answers[question?.key];
  const progress = visibleQuestions.length
    ? visibleIndex / visibleQuestions.length
    : 0;
  const isLast = visibleIndex === visibleQuestions.length - 1;
  const currentStep = question?.step ?? 1;

  const hasAnswer = useCallback(() => {
    if (!question?.required) return true;
    const val = answers[question.key];
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  }, [answers, question]);

  function setAnswer(val: string | string[]) {
    setAnswers((prev) => ({ ...prev, [question.key]: val }));
  }

  async function saveAndAdvance() {
    setError(null);
    setSaving(true);

    const responseText =
      Array.isArray(currentAnswer)
        ? currentAnswer.join(", ")
        : currentAnswer ?? "";

    const responseMetadata = Array.isArray(currentAnswer)
      ? { selected: currentAnswer }
      : undefined;

    try {
      const res = await fetch(`/api/projects/${id}/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionKey: question.key,
          questionText: question.question,
          responseText,
          responseMetadata,
          stepNumber: currentStep,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save answer. Please try again.");
        return;
      }

      if (data.done) {
        setDone(true);
        setTimeout(() => {
          router.push(`/projects/${id}/classify`);
        }, 2000);
      } else {
        setVisibleIndex((i) => i + 1);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (visibleIndex > 0) setVisibleIndex((i) => i - 1);
  }

  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full gradient-brand glow-brand mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Discovery complete
          </h2>
          <p className="text-sm text-muted-foreground">
            Classifying your product intent…
          </p>
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="h-1 bg-border">
        <div
          className="h-full gradient-brand transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 px-4 pb-8">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center justify-center w-6 h-6 rounded gradient-brand">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">
              {question.category}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {visibleIndex + 1} / {visibleQuestions.length}
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2 leading-snug">
              {question.question}
            </h2>
            {question.subtext && (
              <p className="text-sm text-muted-foreground">{question.subtext}</p>
            )}
          </div>

          <div className="mb-6">
            <QuestionInput
              question={question}
              value={currentAnswer}
              onChange={setAnswer}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            {visibleIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 transition-all disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={saveAndAdvance}
              disabled={!hasAnswer() || saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : isLast ? (
                <>
                  Finish discovery
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
            <button
              type="button"
              onClick={saveAndAdvance}
              disabled={saving}
              className="w-full mt-3 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors text-center"
            >
              Skip this question →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
