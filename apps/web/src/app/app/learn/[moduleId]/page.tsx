"use client";

/**
 * Module Units Page
 *
 * Shows all units and topics within a module with progress tracking.
 * Uses the new Module -> Units -> Topics hierarchy.
 *
 * Features:
 * - Collapsible unit accordions
 * - Per-topic download buttons with checkmark when downloaded
 * - Offline content stored in IndexedDB
 * - Language selector
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UnitAccordion, type UnitData } from "@/components/learn/UnitAccordion";
import { LanguageSelector } from "@/components/learn/LanguageSelector";
import { DownloadModal } from "@/components/learn/DownloadModal";
import { useLanguage, type SupportedLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from "@/lib/client-logger";
import { useOfflineLesson } from "@/hooks/useOfflineLesson";

// ============================================================================
// TYPES
// ============================================================================

interface ModuleData {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorGradient: string;
  culturalNote: string | null;
}

interface ModuleWithUnitsResponse {
  module: ModuleData;
  units: UnitData[];
  totalTopics: number;
  completedTopics: number;
  averageMastery: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ModuleUnitsPage({
  params,
}: Readonly<{
  params: Promise<{ moduleId: string }>;
}>) {
  const router = useRouter();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { downloadLesson, isAvailableOffline } = useOfflineLesson();

  // State
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [data, setData] = useState<ModuleWithUnitsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingTopicId, setDownloadingTopicId] = useState<string | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedTopicForDownload, setSelectedTopicForDownload] = useState<string | null>(null);
  const [downloadedTopics, setDownloadedTopics] = useState<Set<string>>(new Set());

  // Resolve params
  useEffect(() => {
    params.then((p) => setModuleId(p.moduleId))
      .catch((err) => { clientLogger.error("Failed to resolve params", { error: err }); });
  }, [params]);

  // Fetch module data (always fresh — see cache: 'no-store' inside)
  const fetchModuleData = useCallback(async () => {
    if (!moduleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/modules/${moduleId}/units?language=${language}`;
      // cache: 'no-store' bypasses browser HTTP cache to ensure fresh progress data
      // revalidatePath() from server actions only invalidates Next.js server cache,
      // NOT the browser's HTTP cache — so we must bypass it here
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/student/start");
          return;
        }
        if (response.status === 404) {
          setError(t("errors.moduleNotFound"));
          return;
        }
        throw new Error("Failed to fetch module data");
      }

      const result: ModuleWithUnitsResponse = await response.json();
      setData(result);
    } catch (err) {
      clientLogger.error("Error fetching module", { error: err });
      setError(t("errors.loadingFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, language, router, t]);

  useEffect(() => {
    fetchModuleData();
  }, [fetchModuleData]);

  // Check IndexedDB for downloaded topics when data loads
  useEffect(() => {
    const checkDownloadedTopics = async () => {
      if (!data || !moduleId) return;

      const allTopics = data.units.flatMap((unit) => unit.topics);

      // PERF-014 FIX: Check all topics in parallel (independent operations)
      const results = await Promise.all(
        allTopics.map(async (topic) => ({
          topicId: topic.id,
          isDownloaded: await isAvailableOffline(moduleId, topic.id, language),
        })),
      );

      const downloaded = new Set<string>(
        results.filter((r) => r.isDownloaded).map((r) => r.topicId),
      );
      setDownloadedTopics(downloaded);
    };

    checkDownloadedTopics();
  }, [data, moduleId, language, isAvailableOffline]);

  // Handle topic download
  const handleDownloadTopic = (topicId: string) => {
    setSelectedTopicForDownload(topicId);
    setDownloadModalOpen(true);
  };

  // Handle download confirmation - saves to IndexedDB via useOfflineLesson hook
  const handleConfirmDownload = async (
    downloadLanguage: SupportedLanguage,
    includeTTS: boolean
  ) => {
    if (!selectedTopicForDownload || !moduleId) return;

    setDownloadingTopicId(selectedTopicForDownload);
    setDownloadModalOpen(false);

    try {
      const result = await downloadLesson({
        moduleId,
        topicId: selectedTopicForDownload,
        language: downloadLanguage,
        includeTTS,
      });

      if (!result.success) {
        throw new Error(result.error || "Download failed");
      }

      // Update downloaded topics set
      setDownloadedTopics((prev) => new Set([...prev, selectedTopicForDownload]));

      toast({
        title: t("learn.downloadComplete"),
        description: t("learn.lessonOffline"),
      });
    } catch (err) {
      clientLogger.error("Download error", { error: err });
      toast({
        title: t("learn.downloadFailed"),
        description: err instanceof Error ? err.message : t("learn.tryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setDownloadingTopicId(null);
      setSelectedTopicForDownload(null);
    }
  };

  // Loading state
  if (isLoading || !moduleId) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/app/learn" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              {t("nav.backToLearningPath")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const progressPercent =
    data.totalTopics > 0
      ? Math.round((data.completedTopics / data.totalTopics) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/app/learn"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("nav.backToLearningPath")}</span>
          </Link>

          <LanguageSelector variant="compact" />
        </div>

        {/* Module Header Card */}
        <div className={`rounded-[32px] bg-gradient-to-r ${data.module.colorGradient} text-white`}>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl sm:text-5xl">{data.module.icon}</div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{data.module.name}</h1>
                  <p className="text-white/80 mt-1">{data.module.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-white/70">
                    <span>{data.units.length} {t("learn.units")}</span>
                    <span>{data.totalTopics} {t("learn.topics")}</span>
                    <span>
                      {data.completedTopics}/{data.totalTopics} {t("learn.complete")}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Cultural Note */}
            {data.module.culturalNote && (
              <p className="mt-3 text-sm text-white/70 flex items-center gap-2">
                <span>🏔️</span>
                {data.module.culturalNote}
              </p>
            )}

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-white/70 mb-1">
                <span>{t("learn.percentComplete", { percent: progressPercent })}</span>
                <span>{t("learn.avg")} {data.averageMastery}%</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Units Accordions */}
        <div className="space-y-4">
          {data.units.map((unit, index) => (
            <UnitAccordion
              key={unit.id}
              unit={{
                ...unit,
                // Update topics with downloaded status from IndexedDB
                topics: unit.topics.map((topic) => ({
                  ...topic,
                  isDownloaded: downloadedTopics.has(topic.id),
                })),
              }}
              moduleId={moduleId}
              defaultOpen={index === 0}
              onDownloadTopic={handleDownloadTopic}
              downloadingTopicId={downloadingTopicId}
            />
          ))}
        </div>

        {/* Empty state if no units */}
        {data.units.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-slate-500">
              {t("learn.noUnitsAvailable")}
            </p>
          </div>
        )}
      </div>

      {/* Download Modal */}
      <DownloadModal
        open={downloadModalOpen}
        onOpenChange={setDownloadModalOpen}
        topicId={selectedTopicForDownload}
        topicName={
          selectedTopicForDownload
            ? data.units
                .flatMap((u) => u.topics)
                .find((t) => t.id === selectedTopicForDownload)?.name || ""
            : ""
        }
        onConfirm={handleConfirmDownload}
        isRedownload={selectedTopicForDownload ? downloadedTopics.has(selectedTopicForDownload) : false}
      />
    </div>
  );
}
