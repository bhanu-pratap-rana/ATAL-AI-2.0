import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function AIToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "var(--gradient-primary)" }}>
          <Link href="/app/student/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">AI Tools 🤖</h1>
          <p className="text-white/80 text-sm font-bold">Personalized AI-powered learning</p>
        </div>

        {/* AI Tutor Card */}
        <Link href="/app/ai-tools/tutor" className="block">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(249,136,25,0.1)" }}>💬</div>
              <div>
                <h2 className="font-black text-slate-800 text-lg">AI Tutor</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Voice + Multilingual</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-4">
              Get personalized help from your AI tutor. Ask questions, get explanations, and receive instant feedback.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">Available</span>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black">Voice Support</span>
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-black">Multilingual</span>
            </div>
          </div>
        </Link>

        {/* History Card */}
        <Link href="/app/ai-tools/history" className="block">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-slate-50">📜</div>
              <div>
                <h2 className="font-black text-slate-800 text-lg">Conversation History</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">All Sessions • Searchable</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm font-bold leading-relaxed">
              View past conversations, review questions and answers, and continue where you left off.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
