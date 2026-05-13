import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, History, MessagesSquare, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-server";

export default async function AIToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Banner */}
        <div
          className="rounded-[32px] border-4 border-white p-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Link
            href="/app/student/dashboard"
            className="inline-flex items-center gap-1.5 text-white/85 text-xs font-black uppercase tracking-widest mb-4 hover:text-white"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0">
              <Bot className="w-7 h-7 text-white" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black mb-0.5 leading-tight">AI Tools</h1>
              <p className="text-white/85 text-sm font-bold">Personalized AI-powered learning</p>
            </div>
          </div>
        </div>

        {/* AI Tutor Card */}
        <Link href="/app/ai-tools/tutor" className="block">
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6 hover:shadow-md transition-all cursor-pointer active:translate-y-0.5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm text-(--bento-orange-d)"
                style={{ background: "var(--bento-tint-orange)" }}
              >
                <MessagesSquare className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-lg">AI Tutor</h2>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Voice • Multilingual
                </p>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-bold leading-relaxed mb-4">
              Get personalized help from your AI tutor. Ask questions, get explanations, and receive
              instant feedback.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black border border-emerald-200">
                Available
              </span>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-black border border-orange-200">
                Voice Support
              </span>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-black border border-purple-200">
                Multilingual
              </span>
            </div>
          </div>
        </Link>

        {/* History Card */}
        <Link href="/app/ai-tools/history" className="block">
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6 hover:shadow-md transition-all cursor-pointer active:translate-y-0.5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm text-(--bento-purple-d)"
                style={{ background: "var(--bento-tint-purple)" }}
              >
                <History className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-lg">Conversation History</h2>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  All Sessions • Searchable
                </p>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-bold leading-relaxed">
              View past conversations, review questions and answers, and continue where you left off.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
