import { Mascot } from "@/components/system";

interface AuthCardProps {
  readonly children: React.ReactNode;
  readonly title: string;
  readonly description?: string;
}

export function AuthCard({ children, title, description }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-8">
      {/* Logo — Jyoti mascot with gentle bob (prefers-reduced-motion
          users see static via the global MotionConfigProvider) */}
      <div className="text-center mb-8 w-full">
        <div className="mb-5 flex justify-center">
          <Mascot size="lg" animate="bob" priority alt="ATAL AI Logo — Jyoti" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1">
          ATAL AI
        </h1>
        <p className="text-sm text-slate-400 font-bold">
          Assam&apos;s Digital Learning Platform
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white rounded-[40px] sm:rounded-[48px] p-8 sm:p-10 shadow-2xl shadow-slate-200">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-slate-400 font-bold">{description}</p>
            )}
          </div>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
