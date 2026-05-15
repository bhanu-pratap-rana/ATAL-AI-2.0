"use client";

import { ClipboardList, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClassCreationSuccessProps {
  readonly classCode: string;
  readonly joinPin: string;
  readonly onDone: () => void;
}

export function ClassCreationSuccess({
  classCode,
  joinPin,
  onDone,
}: ClassCreationSuccessProps) {
  return (
    <div>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Class Created!
          <PartyPopper size={20} strokeWidth={2.5} className="text-(--bento-sky-d)" aria-hidden="true" />
        </DialogTitle>
        <DialogDescription>
          Share these codes with your students to join the class
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Class Code — teacher-blue (this dialog is teacher-only context) */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Class Code</span>
          <div className="[background:var(--bento-tint-sky)] border-2 border-(--bento-sky-d)/30 rounded-2xl p-3 md:p-4">
            <p className="text-2xl md:text-3xl font-mono font-black text-center text-(--bento-sky-d) tracking-widest break-all">
              {classCode}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Students will enter this 6-character code
          </p>
        </div>

        {/* Join PIN */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Join PIN</span>
          <div className="bg-linear-to-br from-cyan-lightest to-cyan/10 border-2 border-cyan/30 rounded-2xl p-3 md:p-4">
            <p className="text-2xl md:text-3xl font-mono font-black text-center text-cyan-dark tracking-widest">
              {joinPin}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            4-digit PIN for class security
          </p>
        </div>

        <div className="bg-warning-light border-l-4 border-warning p-3 rounded">
          <p className="text-sm text-warning-dark">
            <strong className="inline-flex items-center gap-1.5"><ClipboardList size={14} strokeWidth={2.5} aria-hidden="true" />Keep these codes safe!</strong> Students need both
            the class code and PIN to join. You can view these codes
            anytime in the class details.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={onDone}
          variant="ghost"
          className="w-full btn-bento btn-bento-sky text-white! hover:text-white!"
        >
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}
