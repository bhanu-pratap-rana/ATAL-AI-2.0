import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-br from-cream to-surface page-layout">
      <div className="container-responsive max-w-6xl">
        {/* Header */}
        <div className="mb-responsive text-center sm:text-left">
          <Link
            href="/app/dashboard"
            className="text-primary hover:text-primary-dark mb-4 inline-flex items-center gap-1 text-sm md:text-base touch-target"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="heading-1 text-primary mb-2">🤖 AI Tools</h1>
          <p className="text-text-secondary text-sm md:text-base">
            Leverage AI-powered tools for personalized learning
          </p>
        </div>

        {/* AI Tools */}
        <div className="grid gap-responsive">
          <Link href="/app/ai-tools/tutor" className="block">
            <Card className="hover:shadow-lg transition-shadow card-responsive cursor-pointer hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <span>💬</span>
                  <span>AI Tutor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-sm md:text-base mb-4">
                  Get personalized help from an AI-powered tutor that adapts to
                  your learning style.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-success-light text-success-dark rounded-full text-sm">
                    Available
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow card-responsive opacity-70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span>📝</span>
                <span>Essay Feedback</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base mb-4">
                Get instant feedback on your essays and writing assignments with
                AI-powered analysis.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-warning-light text-warning-dark rounded-full text-sm">
                  Coming Soon
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow card-responsive opacity-70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span>🎯</span>
                <span>Practice Generator</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base mb-4">
                Generate customized practice problems based on your learning
                progress and weak areas.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-warning-light text-warning-dark rounded-full text-sm">
                  Coming Soon
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow card-responsive opacity-70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span>🧠</span>
                <span>Study Assistant</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base mb-4">
                Create study guides, flashcards, and summaries from your course
                materials automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-warning-light text-warning-dark rounded-full text-sm">
                  Coming Soon
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
