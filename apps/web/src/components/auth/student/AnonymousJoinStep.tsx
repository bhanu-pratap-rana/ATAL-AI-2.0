/**
 * AnonymousJoinStep — entry point for rural students who have no email
 * or phone. The teacher gives them a 6-character class code, a 4-digit
 * PIN, and (optionally) a roll number on paper; the student picks a
 * display name, signs in anonymously, and lands in the class.
 *
 * Flow:
 *   1. Collect: name, gender, class code, PIN, optional roll number
 *   2. supabase.auth.signInAnonymously()  via handleAnonymousSignIn
 *   3. joinClassAsAnonymous() — server creates student_profiles row +
 *      enrollment in one go
 *   4. Redirect to /app/student/dashboard
 *
 * Anonymous Supabase users have a real `auth.uid()`, so RLS policies on
 * student_profiles and enrollments admit them just like any other
 * authenticated user. The server action refuses if a profile already
 * exists (this entry point is strictly first-contact).
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { handleAnonymousSignIn } from "@/lib/auth-handlers";
import { joinClassAsAnonymous } from "@/app/actions/student";
import {
  sanitizeClassCode,
  sanitizePIN,
} from "@/lib/validation-utils";
import { authLogger } from "@/lib/auth-logger";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAuthStateReturn } from "@/hooks/useAuthState";

interface AnonymousJoinStepProps {
  readonly actions: UseAuthStateReturn["actions"];
}

export function AnonymousJoinStep({ actions }: AnonymousJoinStepProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [classCode, setClassCode] = useState("");
  const [pin, setPin] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateForm(): string | null {
    if (!name.trim()) return "Please enter your name";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (!gender) return "Please select your gender";
    if (!classCode.trim()) return "Please enter your class code";
    if (classCode.trim().length !== 6) return "Class code must be 6 characters";
    if (!pin.trim()) return "Please enter the class PIN";
    if (pin.trim().length !== 4) return "PIN must be 4 digits";
    return null;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const signInResult = await handleAnonymousSignIn(supabase);
      if (!signInResult.success) {
        authLogger.error("[AnonymousJoin] Sign-in failed", signInResult);
        setError(signInResult.error || "Failed to sign in. Please try again.");
        return;
      }

      const joinResult = await joinClassAsAnonymous({
        name: name.trim(),
        gender: gender as "male" | "female",
        classCode: classCode.toUpperCase().trim(),
        pin: pin.trim(),
        rollNumber: rollNumber.trim() || undefined,
      });

      if (!joinResult.success) {
        await supabase.auth.signOut();
        setError(joinResult.error || "Failed to join class. Please try again.");
        return;
      }

      toast.success(`Welcome, ${name.trim()}! You're now in the class.`);
      router.push("/app/student/dashboard");
    } catch (err) {
      authLogger.error("[AnonymousJoin] Unexpected error", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center p-4">
      <AuthCard
        title="Join a Class"
        description="Use the code your teacher gave you — no email or phone needed."
      >
        <div className="flex justify-center mb-2">
          <div className="bg-(--bento-tint-orange) p-4 rounded-2xl border-2 border-white">
            <GraduationCap
              className="w-8 h-8 text-(--bento-orange-d)"
              strokeWidth={2.25}
              aria-hidden="true"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anon-name">Your Name</Label>
            <Input
              id="anon-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Anjali Das"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              maxLength={50}
            />
            <p className="text-xs text-slate-500">Shown to your teacher and classmates</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anon-gender">Gender</Label>
            <div role="radiogroup" aria-labelledby="anon-gender" className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={gender === "male" ? "default" : "outline"}
                onClick={() => setGender("male")}
                disabled={loading}
                aria-checked={gender === "male"}
                role="radio"
              >
                Male
              </Button>
              <Button
                type="button"
                variant={gender === "female" ? "default" : "outline"}
                onClick={() => setGender("female")}
                disabled={loading}
                aria-checked={gender === "female"}
                role="radio"
              >
                Female
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anon-class-code">Class Code</Label>
            <Input
              id="anon-class-code"
              type="text"
              placeholder="A3F7E2"
              value={classCode}
              onChange={(e) => setClassCode(sanitizeClassCode(e.target.value))}
              required
              disabled={loading}
              maxLength={6}
              className="uppercase font-mono text-center text-xl tracking-widest"
            />
            <p className="text-xs text-slate-500">6 characters, on the slip from your teacher</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anon-pin">Class PIN</Label>
            <Input
              id="anon-pin"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="1234"
              value={pin}
              onChange={(e) => setPin(sanitizePIN(e.target.value))}
              required
              disabled={loading}
              maxLength={4}
              className="font-mono text-center text-xl tracking-widest"
            />
            <p className="text-xs text-slate-500">4 digits, also on the slip</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anon-roll-number">Roll Number (Optional)</Label>
            <Input
              id="anon-roll-number"
              type="text"
              placeholder="e.g. 14"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              disabled={loading}
              maxLength={10}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full text-[17px]"
          >
            {loading ? "Joining…" : "Join Class"}
          </Button>

          <Button
            type="button"
            variant="link"
            onClick={() => actions.setMainStep("choice")}
            disabled={loading}
            className="w-full text-sm gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
            Back to options
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
