/**
 * QuickGuideCard Component
 * Displays instructions when no school is selected
 */

import { BookOpen, Lightbulb } from "lucide-react";

export function QuickGuideCard() {
  return (
    <div className="bg-cyan-lightest border-l-4 border-cyan p-4 rounded-2xl">
      <div className="flex gap-3">
        <div className="shrink-0 w-10 h-10 rounded-2xl bg-white border-2 border-white shadow-sm flex items-center justify-center text-cyan-darkest">
          <BookOpen className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-black text-cyan-darkest mb-2">
            How to manage school PINs
          </h3>
          <ol className="text-sm text-cyan-darkest space-y-1 list-decimal list-inside">
            <li>Search for a school by name or code</li>
            <li>Click on a school from the suggestions</li>
            <li>View the current PIN status</li>
            <li>Generate and rotate a new PIN if needed</li>
            <li>Copy the PIN to share with school staff</li>
          </ol>
          <p className="text-xs text-cyan mt-3 font-medium flex items-start gap-1.5">
            <Lightbulb size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0 mt-0.5" />
            <span>Tip: Generate a new PIN to help schools verify their identity during verification process.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
