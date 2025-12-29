'use client';

/**
 * Lesson Pre-Cacher Component
 *
 * Client component that pre-caches lessons for offline access.
 * Runs silently in the background when a module page is loaded.
 * Uses the lesson-cache service to store content for offline use.
 */

import { useEffect, useState } from 'react';
import { preCacheLessons, type Language } from '@/lib/offline/lesson-cache';
import { Download, CheckCircle, Loader2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Button } from '@/components/ui/button';
import { clientLogger } from '@/lib/client-logger';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface LessonPreCacherProps {
  moduleId: string;
  language?: Language;
  topicIds: string[];
  /** Show a visible indicator (default: false for silent caching) */
  showIndicator?: boolean;
}

export function LessonPreCacher({
  moduleId,
  language = 'en',
  topicIds,
  showIndicator = false,
}: LessonPreCacherProps) {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState<'idle' | 'caching' | 'done' | 'error'>('idle');
  const [cached, setCached] = useState(0);
  const [total, setTotal] = useState(topicIds.length);

  useEffect(() => {
    // Only pre-cache when online
    if (!isOnline) return;

    // Don't re-cache if already done
    if (status === 'done') return;

    const doCaching = async () => {
      setStatus('caching');
      setTotal(topicIds.length);

      try {
        const result = await preCacheLessons(moduleId, language);
        setCached(result.cached);
        setStatus('done');

        // Log for debugging (can be removed in production)
        clientLogger.debug('[LessonPreCacher] Cached lessons', { cached: result.cached, failed: result.failed, moduleId });
      } catch (error) {
        clientLogger.error('[LessonPreCacher] Error', error instanceof Error ? error : { error: String(error) });
        setStatus('error');
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
            disabled={status === 'caching'}
          >
            {status === 'caching' ? (
              <Loader2 className="h-4 w-4 animate-spin text-warning" />
            ) : status === 'done' ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <Download className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {status === 'caching'
            ? `Caching lessons for offline... (${cached}/${total})`
            : status === 'done'
            ? `${cached} lessons available offline`
            : status === 'error'
            ? 'Failed to cache lessons'
            : isOnline
            ? 'Preparing offline access...'
            : 'Go online to cache lessons'}
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
  language = 'en',
}: {
  moduleId: string;
  moduleName: string;
  language?: Language;
}) {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ cached: 0, total: 0 });

  const handleDownload = async () => {
    if (!isOnline || status === 'downloading') return;

    setStatus('downloading');

    try {
      const result = await preCacheLessons(moduleId, language);
      setProgress({ cached: result.cached, total: result.cached + result.failed });
      setStatus('done');
    } catch (error) {
      clientLogger.error('[DownloadModuleButton] Error', error instanceof Error ? error : { error: String(error) });
      setStatus('error');
    }
  };

  return (
    <Button
      variant={status === 'done' ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleDownload}
      disabled={!isOnline || status === 'downloading'}
      className="gap-2"
    >
      {status === 'downloading' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Downloading...
        </>
      ) : status === 'done' ? (
        <>
          <CheckCircle className="h-4 w-4 text-success" />
          Downloaded ({progress.cached} lessons)
        </>
      ) : status === 'error' ? (
        <>
          <Download className="h-4 w-4 text-error" />
          Retry Download
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download {moduleName}
        </>
      )}
    </Button>
  );
}
