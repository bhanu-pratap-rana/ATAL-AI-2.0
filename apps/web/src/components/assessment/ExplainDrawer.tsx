"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, SkipForward } from "lucide-react";

/**
 * F-PROD-AS01: ExplainDrawer replaces the silent-skip behavior of the
 * "I don't understand this question" button. Opens a side drawer (or
 * bottom sheet on mobile) and asks an LLM to rephrase the question in
 * the student's language without revealing the answer.
 *
 * If the LLM call fails, the student can still skip — but with eyes
 * open.
 */
interface ExplainDrawerProps {
  readonly open: boolean;
  readonly question: string;
  readonly options?: string[];
  readonly language: "en" | "hi" | "as";
  readonly module?: string;
  readonly onClose: () => void;
  readonly onSkip: () => void;
}

export function ExplainDrawer({
  open,
  question,
  options,
  language,
  module,
  onClose,
  onSkip,
}: ExplainDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable serialised key so a fresh `options` array reference on
  // every parent render doesn't refire the fetch. Original bug:
  // ExplainDrawer was opened once and useEffect with `options` in the
  // dep array re-ran on every parent re-render, hammering the
  // /api/assessment/explain endpoint until the rate-limiter (429)
  // started rejecting and the abort/refire loop spiked CPU.
  const optionsKey = options ? options.join("|") : "";

  useEffect(() => {
    if (!open) return;
    setExplanation(null);
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    fetch("/api/assessment/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options, language, module }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Couldn't generate an explanation right now.");
        }
        setExplanation(typeof data.explanation === "string" ? data.explanation : "");
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // `options` is intentionally NOT in deps — we depend on the joined
    // string key so identical option lists don't trigger refires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question, optionsKey, language, module]);

  const titleByLanguage: Record<"en" | "hi" | "as", string> = {
    en: "Let me help you understand",
    hi: "मैं आपकी मदद करता हूँ",
    as: "মই আপোনাক বুজাব",
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <Lightbulb className="h-5 w-5 text-warning" aria-hidden="true" />
            {titleByLanguage[language]}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Thinking of a simpler way to say this…</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-error/30 bg-error-light p-3 text-sm text-error-dark"
            >
              {error}
            </div>
          )}

          {explanation && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-base leading-relaxed text-slate-800">
              {explanation}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onSkip();
              onClose();
            }}
            className="text-warning hover:text-warning-dark hover:bg-warning-light"
            aria-label="Skip this question"
          >
            <SkipForward className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Skip anyway
          </Button>
          <Button type="button" onClick={onClose} aria-label="Close and try the question again">
            OK, I&apos;ll try
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
