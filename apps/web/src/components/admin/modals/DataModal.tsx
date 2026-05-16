"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Reusable modal wrapper component for displaying data lists
 * Consolidates universal modal structure across 5 different modal types
 * Eliminates 42 lines of duplicated modal container code
 */

interface DataModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly onClose: () => void;
  readonly isLoading: boolean;
  readonly children: ReactNode;
  readonly searchPlaceholder?: string;
}

export function DataModal({
  isOpen,
  title,
  searchQuery,
  onSearchChange,
  onClose,
  isLoading,
  children,
  searchPlaceholder = "Search...",
}: DataModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Focus management: when the modal opens, move focus into the panel
  // (preferring the search input); when it closes, restore focus to the
  // element that opened it. This satisfies the WAI-ARIA modal pattern
  // alongside the role/aria-modal/aria-labelledby attributes below.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    // Defer so the modal DOM is mounted before we query for the input.
    queueMicrotask(() => {
      const input = panelRef.current?.querySelector<HTMLElement>(
        "input, [tabindex]:not([tabindex='-1']), button",
      );
      input?.focus();
    });
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto rounded-3xl bg-background shadow-lg"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-background border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-black text-slate-800">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-slate-200 px-6 py-4">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span className="ml-2 text-slate-500">Loading...</span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-background px-6 py-4">
          <Button onClick={onClose} variant="secondary" className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
