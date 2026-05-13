/**
 * Learning Style Profile Dashboard
 *
 * Displays the student's learning style preferences based on their behavior.
 * Shows visual, text, and auditory scores with tips for each style.
 *
 * Data source: learning_style_profile table
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import {
  fetchLearningStyleProfile,
  createDefaultProfile,
} from "@/lib/database/learning-profile-queries";
import { LearningStyleCard } from "@/components/learning/LearningStyleCard";

// Learning style tips and descriptions
const STYLE_INFO = {
  visual: {
    icon: "👁️",
    title: "Visual Learner",
    description: "You learn best through images, diagrams, and visual representations.",
    tips: [
      "Use mind maps and diagrams to organize information",
      "Watch video tutorials and demonstrations",
      "Highlight key concepts with different colors",
      "Create visual flashcards for memorization",
    ],
  },
  text: {
    icon: "📖",
    title: "Text Learner",
    description: "You learn best through reading and written explanations.",
    tips: [
      "Take detailed notes while learning",
      "Read and re-read important materials",
      "Write summaries in your own words",
      "Create lists and outlines to organize content",
    ],
  },
  auditory: {
    icon: "🎧",
    title: "Auditory Learner",
    description: "You learn best through listening and verbal explanations.",
    tips: [
      "Use the voice feature when available",
      "Read content aloud to yourself",
      "Discuss topics with classmates or teachers",
      "Listen to explanations multiple times",
    ],
  },
};

export default async function LearningStylePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  // SECURITY: Learning Style page is teacher-only (for class management)
  // Students should not see this - it's for teachers to understand student learning preferences
  const role = user.app_metadata?.role;
  const isTeacher = role === "teacher" || role === "admin" || role === "super_admin";
  
  if (!isTeacher) {
    redirect("/app/student/dashboard");
  }

  // Fetch or create learning style profile
  let profile = await fetchLearningStyleProfile(user.id);
  if (!profile) {
    profile = await createDefaultProfile(user.id);
  }

  // Calculate percentages and determine dominant style
  const totalScore =
    (profile?.visual_score ?? 33.33) +
    (profile?.text_score ?? 33.33) +
    (profile?.auditory_score ?? 33.33);

  const visualPercent = Math.round(((profile?.visual_score ?? 33.33) / totalScore) * 100);
  const textPercent = Math.round(((profile?.text_score ?? 33.33) / totalScore) * 100);
  const auditoryPercent = Math.round(((profile?.auditory_score ?? 33.33) / totalScore) * 100);

  // Determine dominant style
  const dominantStyle = profile?.preferred_style ||
    (visualPercent >= textPercent && visualPercent >= auditoryPercent
      ? "visual"
      : textPercent >= auditoryPercent
        ? "text"
        : "auditory");

  const dominantInfo = STYLE_INFO[dominantStyle as keyof typeof STYLE_INFO] || STYLE_INFO.visual;

  // Activity stats
  const imagesViewed = profile?.images_viewed ?? 0;
  const voiceReplays = profile?.voice_replays ?? 0;
  const textReadTime = profile?.text_read_time_seconds ?? 0;
  const hasActivity = imagesViewed > 0 || voiceReplays > 0 || textReadTime > 0;

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "var(--gradient-primary)" }}>
          <Link href="/app/student/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">🧠 Your Learning Style</h1>
          <p className="text-white/80 text-sm font-bold">Discover how you learn best based on your interactions</p>
        </div>

        {/* Dominant Style Card */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{dominantInfo.icon}</span>
            <h2 className="text-xl font-black text-slate-800">{dominantInfo.title}</h2>
          </div>
          <p className="text-slate-500 font-bold text-sm mb-3">{dominantInfo.description}</p>
          {!hasActivity && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-700">
                <strong>Note:</strong> Your learning style profile is still being calculated.
                Continue using the AI Tutor and learning materials to get more accurate results.
              </p>
            </div>
          )}
        </div>

        {/* Style Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LearningStyleCard style="visual" score={visualPercent} isActive={dominantStyle === "visual"} icon={STYLE_INFO.visual.icon} title="Visual" activityCount={imagesViewed} activityLabel="images viewed" />
          <LearningStyleCard style="text" score={textPercent} isActive={dominantStyle === "text"} icon={STYLE_INFO.text.icon} title="Text" activityCount={Math.round(textReadTime / 60)} activityLabel="minutes reading" />
          <LearningStyleCard style="auditory" score={auditoryPercent} isActive={dominantStyle === "auditory"} icon={STYLE_INFO.auditory.icon} title="Auditory" activityCount={voiceReplays} activityLabel="voice replays" />
        </div>

        {/* Tips Section */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">💡 Tips for {dominantInfo.title}s</h2>
          <ul className="space-y-3">
            {dominantInfo.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                <span className="text-orange-500 font-black">✓</span>
                <span className="text-slate-700 font-bold text-sm">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6">
          <h2 className="font-black text-slate-800 text-lg mb-3">📊 How Your Style Is Calculated</h2>
          <p className="text-slate-500 font-bold text-sm mb-4">Your learning style is determined by tracking how you interact with content:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {[
              { label: "Visual Score", desc: "Increases when you view images and diagrams" },
              { label: "Text Score", desc: "Increases based on time spent reading content" },
              { label: "Auditory Score", desc: "Increases when you use voice features" },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-slate-50 rounded-2xl">
                <span className="font-black text-orange-500">{item.label}</span>
                <p className="text-slate-400 font-bold mt-1 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
