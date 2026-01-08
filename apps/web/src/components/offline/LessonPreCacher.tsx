"use client";

/**
 * Lesson Pre-Cacher Component
 *
 * Client component that pre-caches lessons for offline access.
 * Runs silently in the background when a module page is loaded.
 * Uses the lesson-cache service to store content for offline use.
 */

import { useEffect, useState } from "react";
import { preCacheLessons, type Language } from "@/lib/offline/lesson-cache";
import { Download, CheckCircle, Loader2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

type CacheStatus = "idle" | "caching" | "done" | "error";
type DownloadStatus = "idle" | "downloading" | "done" | "error";

interface LessonPreCacherProps {
  readonly moduleId: string;
  readonly language?: Language;
  readonly topicIds: string[];
  /** Show a visible indicator (default: false for silent caching) */
  readonly showIndicator?: boolean;
}

/**
 * Get cache status icon based on caching state
 */
function getCacheStatusIcon(status: CacheStatus) {
  switch (status) {
    case "caching":
      return <Loader2 className="h-4 w-4 animate-spin text-warning" />;
    case "done":
      return <CheckCircle className="h-4 w-4 text-success" />;
    default:
      return <Download className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get cache status tooltip message
 */
function getCacheStatusTooltip(
  status: CacheStatus,
  cached: number,
  total: number,
  isOnline: boolean,
): string {
  if (status === "caching") {
    return `Caching lessons for offline... (${cached}/${total})`;
  }
  if (status === "done") {
    return `${cached} lessons available offline`;
  }
  if (status === "error") {
    return "Failed to cache lessons";
  }
  return isOnline ? "Preparing offline access..." : "Go online to cache lessons";
}

/**
 * Get download button content based on download state
 */
function getDownloadButtonContent(
  status: DownloadStatus,
  cached: number,
  moduleName: string,
) {
  switch (status) {
    case "downloading":
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Downloading...
        </>
      );
    case "done":
      return (
        <>
          <CheckCircle className="h-4 w-4 text-success" />
          Downloaded ({cached} lessons)
        </>
      );
    case "error":
      return (
        <>
          <Download className="h-4 w-4 text-error" />
          Retry Download
        </>
      );
    default:
      return (
        <>
          <Download className="h-4 w-4" />
          Download {moduleName}
        </>
      );
  }
}

export function LessonPreCacher({
  moduleId,
  language = "en",
  topicIds,
  showIndicator = false,
}: LessonPreCacherProps) {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState<CacheStatus>("idle");
  const [cached, setCached] = useState(0);
  const [total, setTotal] = useState(topicIds.length);

  useEffect(() => {
    // Only pre-cache when online
    if (!isOnline) return;

    // Don't re-cache if already done
    if (status === "done") return;

    const doCaching = async () => {
      setStatus("caching");
      setTotal(topicIds.length);

      try {
        const result = await preCacheLessons(moduleId, language);
        setCached(result.cached);
        setStatus("done");

        // Log for debugging (can be removed in production)
        clientLogger.debug("[LessonPreCacher] Cached lessons", {
          cached: result.cached,
          failed: result.failed,
          moduleId,
        });
      } catch (error) {
        clientLogger.error(
          "[LessonPreCacher] Error",
          error instanceof Error ? error : { error: String(error) },
        );
        setStatus("error");
      }
    };

    // Delay caching slightly to not block initial render
    const timer = setTimeout(doCaching, 2000);
    return () => clearTimeout(timer);
  }, [moduleId, language, topicIds.length, isOnline, status]);

  // Silent mode - render nothing
  if (!showIndicator) {
    return null;
  }

  // Visible indicator mode
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={status === "caching"}
          >
            {getCacheStatusIcon(status)}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {getCacheStatusTooltip(status, cached, total, isOnline)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Manual Cache Button
 *
 * Allows users to explicitly download a module for offline use.
 */
export function DownloadModuleButton({
  moduleId,
  moduleName,
  language = "en",
}: {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly language?: Language;
}) {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState({ cached: 0, total: 0 });

  const handleDownload = async () => {
    if (!isOnline || status === "downloading") return;

    setStatus("downloading");

    try {
      const result = await preCacheLessons(moduleId, language);
      setProgress({
        cached: result.cached,
        total: result.cached + result.failed,
      });
      setStatus("done");
    } catch (error) {
      clientLogger.error(
        "[DownloadModuleButton] Error",
        error instanceof Error ? error : { error: String(error) },
      );
      setStatus("error");
    }
  };

  return (
    <Button
      variant={status === "done" ? "secondary" : "outline"}
      size="sm"
      onClick={handleDownload}
      disabled={!isOnline || status === "downloading"}
      className="gap-2"
    >
      {getDownloadButtonContent(status, progress.cached, moduleName)}
    </Button>
  );
}
