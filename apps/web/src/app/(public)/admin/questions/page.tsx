"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import {
  LogOut,
  ArrowLeft,
  Database,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { clientLogger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import {
  getIRTQuestions,
  updateIRTQuestion,
} from "@/app/actions/admin-irt";

interface IRTQuestion {
  id: string;
  item_code: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: number;
  category: string;
  level: string;
  language: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  is_active: boolean | null;
  times_administered: number | null;
  times_correct: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * IRT Item Bank Admin Page
 *
 * Allows admins to view, search, and edit IRT item bank questions.
 * Features:
 * - Search by question text or item code
 * - Filter by category, level, language
 * - Edit IRT parameters (difficulty, discrimination, guessing)
 * - Toggle active status
 *
 * Security: Only accessible by admin/super_admin users (RLS enforced)
 */
export default function IRTItemBankAdminPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<IRTQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchQuestions = useCallback(async () => {
    try {
      const result = await getIRTQuestions({
        category: selectedCategory,
        level: selectedLevel,
        language: selectedLanguage,
        limit: 100,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setQuestions(result.data);
      setError(null);
    } catch (err) {
      clientLogger.error("[IRTAdmin] Error fetching questions", err instanceof Error ? err : { err });
      setError("Failed to load questions. Please try again.");
    }
  }, [selectedCategory, selectedLevel, selectedLanguage]);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          router.push("/admin/login");
          return;
        }

        // Check admin role
        const role = user.app_metadata?.role;
        if (
          typeof role !== "string" ||
          !["admin", "super_admin"].includes(role)
        ) {
          clientLogger.warn("[IRTAdmin] Non-admin access attempt", { role });
          router.push("/admin/login");
          return;
        }

        setUserEmail(user.email);
        await fetchQuestions();
      } catch (err) {
        clientLogger.error("[IRTAdmin] Auth check failed", err instanceof Error ? err : { err });
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [router, supabase, fetchQuestions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQuestions();
    setIsRefreshing(false);
  };

  const handleUpdateQuestion = async (
    questionId: string,
    updates: Partial<
      Pick<IRTQuestion, "difficulty" | "discrimination" | "guessing" | "is_active">
    >
  ) => {
    try {
      const sanitized = {
        ...(updates.difficulty !== undefined && { difficulty: updates.difficulty }),
        ...(updates.discrimination !== undefined && { discrimination: updates.discrimination }),
        ...(updates.guessing !== undefined && { guessing: updates.guessing }),
        ...(updates.is_active !== undefined &&
          updates.is_active !== null && { is_active: updates.is_active }),
      };
      const result = await updateIRTQuestion(questionId, sanitized);
      if (!result.success) {
        throw new Error(result.error);
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, ...updates, updated_at: new Date().toISOString() }
            : q
        )
      );

      clientLogger.info("[IRTAdmin] Question updated", { questionId, updates });
    } catch (err) {
      clientLogger.error("[IRTAdmin] Error updating question", err instanceof Error ? err : { err });
      throw err;
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  // Filter questions by search query
  const filteredQuestions = questions.filter(
    (q) =>
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.item_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique filter values
  const categories = Array.from(new Set(questions.map((q) => q.category)));
  const levels = Array.from(new Set(questions.map((q) => q.level)));
  const languages = Array.from(new Set(questions.map((q) => q.language)));

  // Stats
  const activeCount = questions.filter((q) => q.is_active !== false).length;
  const totalCount = questions.length;

  if (isLoading) {
    return (
      <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--bento-orange)"></div>
          <p className="mt-4 text-slate-500">Loading item bank...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Gradient banner — canonical SP13 admin theme */}
        <div
          className="rounded-[32px] p-6 text-white"
          style={{ background: "var(--gradient-admin)" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-1 inline-flex items-center gap-2">
                <Database className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                IRT Item Bank
              </h1>
              <p className="text-white/85 text-xs font-black uppercase tracking-widest truncate">
                {userEmail ? `${userEmail} · ` : ""}Manage assessment questions and IRT parameters
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => router.push("/admin/dashboard")}
                variant="ghost"
                className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
              >
                <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
                aria-label="Sign out"
              >
                <LogOut size={18} strokeWidth={2.25} aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-text">{totalCount}</div>
            <div className="text-sm text-slate-500">Total Questions</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-success">{activeCount}</div>
            <div className="text-sm text-slate-500">Active</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-slate-400">
              {totalCount - activeCount}
            </div>
            <div className="text-sm text-slate-500">Inactive</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-primary">
              {categories.length}
            </div>
            <div className="text-sm text-slate-500">Categories</div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <p className="text-error">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by question or item code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCategory || ""}
                onChange={(e) =>
                  setSelectedCategory(e.target.value || null)
                }
                className="text-sm border border-slate-200 rounded px-2 py-1"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <select
              value={selectedLevel || ""}
              onChange={(e) => setSelectedLevel(e.target.value || null)}
              className="text-sm border border-slate-200 rounded px-2 py-1"
            >
              <option value="">All Levels</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            {/* Language Filter */}
            <select
              value={selectedLanguage || ""}
              onChange={(e) => setSelectedLanguage(e.target.value || null)}
              className="text-sm border border-slate-200 rounded px-2 py-1"
            >
              <option value="">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center">
              <Database className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-text mb-1">
                {searchQuery ? "No questions found" : "No questions"}
              </h3>
              <p className="text-slate-500">
                {searchQuery
                  ? `No questions match "${searchQuery}"`
                  : "Questions will appear here once added to the item bank."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-2">
                Showing {filteredQuestions.length} of {totalCount} questions
              </p>
              {filteredQuestions.map((question) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  onUpdate={handleUpdateQuestion}
                />
              ))}
            </>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-secondary/5 border border-secondary/20 rounded-2xl p-6">
          <h3 className="font-black text-secondary mb-2">
            About IRT Parameters
          </h3>
          <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
            <li>
              <strong>Difficulty (b):</strong> How hard the question is. Range:
              -3 (very easy) to +3 (very hard)
            </li>
            <li>
              <strong>Discrimination (a):</strong> How well the question
              separates high and low ability students. Range: 0 to 3
            </li>
            <li>
              <strong>Guessing (c):</strong> Probability of guessing correctly.
              For 4 options: typically 0.25
            </li>
            <li>
              Changes to IRT parameters affect adaptive testing and score
              calculations
            </li>
          </ul>
        </div>
      </main>
      </div>
    </div>
  );
}
