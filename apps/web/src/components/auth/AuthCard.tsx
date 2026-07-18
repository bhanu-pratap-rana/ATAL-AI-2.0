/**
 * AuthCard — shared wrapper for ALL auth step screens.
 *
 * SP13 PR-5: Refactored to Playful-Bento. Touching this one
 * component cascades the new look to every auth step (SignIn,
 * SignUp, ForgotPassword, JoinClass, ProfileStep, plus the teacher
 * variants that import this wrapper).
 *
 * The cascade is intentional: AuthCard owns the page chrome (bg
 * blobs, mascot frame, card style, heading typography) so each step
 * can stay focused on its own form fields.
 */

import { ChunkCard, Mascot, RainbowRing } from "@/components/system";

interface AuthCardProps {
  readonly children: React.ReactNode;
  readonly title: string;
  readonly description?: string;
}

export function AuthCard({ children, title, description }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden [background:var(--bento-bg)]">
      {/* Decorative pastel blobs — pure decoration, behind content */}
      <div
        className="bento-blob -top-24 -left-24 w-96 h-96"
        style={{ background: "var(--bento-yellow)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob bottom-0 -right-24 w-80 h-80"
        style={{ background: "var(--bento-purple)" }}
        aria-hidden="true"
      />

      {/* Logo — Jyoti mascot framed by the rainbow ring; bobs gently
          on idle. prefers-reduced-motion users see static via the
          global MotionConfigProvider. */}
      <div className="relative text-center mb-6 w-full">
        <div className="mb-4 flex justify-center">
          <RainbowRing>
            <Mascot size="lg" animate="bob" priority alt="ATAL AI Logo — Jyoti" />
          </RainbowRing>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1">
          ATAL <span className="text-(--bento-orange-d)">AI</span>
        </h1>
        <p className="text-sm text-slate-500 font-bold">
          Assam&apos;s Premier Digital Learning Platform
        </p>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm sm:max-w-md">
        <ChunkCard size="lg">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-slate-500 font-bold">{description}</p>
            )}
          </div>
          <div className="space-y-4">{children}</div>
        </ChunkCard>
      </div>
    </div>
  );
}
