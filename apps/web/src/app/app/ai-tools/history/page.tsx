/**
 * Student Conversation History Page
 *
 * Displays all past AI tutor conversations for the student.
 * Allows viewing full conversations and continuing past sessions.
 *
 * Data source: ai_tutor_interactions table
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ConversationHistory } from "@/components/tutor/ConversationHistory";
import { authLogger } from "@/lib/auth-logger";

export default async function ConversationHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  // Fetch all conversations grouped by session
  const { data: interactions, error } = await supabase
    .from("ai_tutor_interactions")
    .select("id, session_id, topic_id, message_role, message_content, input_mode, language, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    authLogger.error("[ConversationHistory] Error fetching interactions:", error);
  }

  // Group interactions by session_id
  const sessionMap = new Map<string, {
    session_id: string;
    topic_id: string | null;
    language: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      input_mode: string;
      created_at: string;
    }>;
    first_message_at: string;
    last_message_at: string;
    message_count: number;
  }>();

  interactions?.forEach((interaction) => {
    const existing = sessionMap.get(interaction.session_id);

    if (existing) {
      existing.messages.push({
        id: interaction.id,
        role: interaction.message_role,
        content: interaction.message_content,
        input_mode: interaction.input_mode || "text",
        created_at: interaction.created_at || "",
      });
      existing.message_count++;
      // Update first/last message times
      if (interaction.created_at && interaction.created_at < existing.first_message_at) {
        existing.first_message_at = interaction.created_at;
      }
      if (interaction.created_at && interaction.created_at > existing.last_message_at) {
        existing.last_message_at = interaction.created_at;
      }
    } else {
      sessionMap.set(interaction.session_id, {
        session_id: interaction.session_id,
        topic_id: interaction.topic_id,
        language: interaction.language || "en",
        messages: [{
          id: interaction.id,
          role: interaction.message_role,
          content: interaction.message_content,
          input_mode: interaction.input_mode || "text",
          created_at: interaction.created_at || "",
        }],
        first_message_at: interaction.created_at || "",
        last_message_at: interaction.created_at || "",
        message_count: 1,
      });
    }
  });

  // Convert to array and sort by most recent
  const sessions = Array.from(sessionMap.values())
    .map((session) => ({
      ...session,
      // Sort messages chronologically within each session
      messages: session.messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }))
    .sort((a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

  const totalConversations = sessions.length;
  const totalMessages = interactions?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}>
          <Link href="/app/ai-tools" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← AI Tools
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Conversation History 💬</h1>
          <p className="text-white/80 text-sm font-bold">View your past conversations with the AI Tutor</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-orange-600 mb-1">{totalConversations}</p>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Conversations</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-blue-600 mb-1">{totalMessages}</p>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Messages</p>
          </div>
        </div>

        {/* Conversations List */}
        {sessions.length > 0 ? (
          <ConversationHistory sessions={sessions} />
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-5xl mb-4">🤖</div>
            <h3 className="font-black text-slate-800 text-lg mb-2">No conversations yet</h3>
            <p className="font-bold text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Start a conversation with the AI Tutor to get help with your learning.
            </p>
            <Link
              href="/app/ai-tools/tutor"
              className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 inline-block"
              style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)", boxShadow: "0 4px 14px rgba(249,136,25,0.39)" }}
            >
              Start a Conversation
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
