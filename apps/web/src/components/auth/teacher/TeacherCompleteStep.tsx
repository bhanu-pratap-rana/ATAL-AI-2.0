/**
 * TeacherCompleteStep Component
 * Extracted from teacher/start/page.tsx to reduce cognitive complexity
 * Displays completion message and redirects to dashboard
 */

"use client";

import { PartyPopper } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";

export function TeacherCompleteStep() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
      <AuthCard
        title="Registration Complete!"
        description="Welcome to ATAL AI"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-(--bento-tint-orange) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-orange-d)">
            <PartyPopper className="w-9 h-9 sm:w-11 sm:h-11" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <p className="text-lg font-black">You&apos;re all set!</p>
          <p className="text-sm text-slate-500">
            Redirecting to your teacher dashboard...
          </p>
        </div>
      </AuthCard>
    </div>
  );
}
