"use client";

/**
 * Badges Display Component
 *
 * Shows earned and locked badges with cultural Assamese themes.
 * Features:
 * - 10 cultural badges (Muga Silk, Bihu, Brahmaputra, etc.)
 * - Trilingual names (English, Hindi, Assamese)
 * - Rarity tiers (common, uncommon, rare, legendary)
 * - Animated unlock effects
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";
import type { Badge as BaseBadge } from "@/lib/services/gamification-service";

/**
 * Display-specific Badge type with earned status
 * Extends base Badge but makes unlock_criteria optional (not needed for display)
 * and adds earned_at for tracking when the badge was earned
 */
interface DisplayBadge extends Omit<
  BaseBadge,
  "unlock_criteria" | "cultural_note"
> {
  readonly cultural_note: string | null;
  readonly earned_at?: string;
}

interface BadgesDisplayProps {
  readonly studentId: string;
  readonly language?: "en" | "hi" | "as";
  readonly showAll?: boolean;
}

// Rarity colors and styles - using semantic CSS variables where possible
const RARITY_STYLES = {
  common: {
    bg: "bg-muted",
    border: "border-muted-foreground/30",
    text: "text-muted-foreground",
    glow: "",
  },
  uncommon: {
    bg: "bg-success/10",
    border: "border-success",
    text: "text-success",
    glow: "shadow-success/20",
  },
  rare: {
    bg: "bg-primary/10",
    border: "border-primary",
    text: "text-primary",
    glow: "shadow-primary/30",
  },
  legendary: {
    bg: "bg-gradient-to-br from-warning/20 to-warning/10",
    border: "border-warning",
    text: "text-warning",
    glow: "shadow-warning/30 shadow-lg",
  },
};

export function BadgesDisplay({
  studentId,
  language = "en",
  showAll = true,
}: BadgesDisplayProps) {
  const [badges, setBadges] = useState<DisplayBadge[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);
  // eslint-disable-next-line react-hooks/immutability -- fetchBadges is stable via useCallback

  useEffect(() => {
    fetchBadges();
  }, [studentId]);

  const fetchBadges = useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch all badges from the database
      const { data: badgesData, error: badgesError } = await supabase
        .from("badges")
        .select("*")
        .order("rarity", { ascending: true });

      if (badgesError) {
        clientLogger.error("[BadgesDisplay] Error fetching badges:", {
          message: badgesError.message,
        });
        setBadges([]);
        setEarnedIds(new Set());
        setLoading(false);
        return;
      }

      // Fetch student's earned badges
      const { data: earnedData, error: earnedError } = await supabase
        .from("student_badges")
        .select("badge_id, earned_at")
        .eq("student_id", studentId);

      if (earnedError) {
        clientLogger.error("[BadgesDisplay] Error fetching earned badges:", {
          message: earnedError.message,
        });
      }

      // Map database badges to component format
      const allBadges: DisplayBadge[] = (badgesData || []).map((b) => ({
        id: b.id,
        name_en: b.name_en,
        name_hi: b.name_hi,
        name_as: b.name_as,
        description: b.description,
        icon: b.icon,
        cultural_note: b.cultural_note,
        rarity: b.rarity as "common" | "uncommon" | "rare" | "legendary",
        points_value: b.points_value || 100,
        earned_at: earnedData?.find((e) => e.badge_id === b.id)?.earned_at,
      }));

      // Create set of earned badge IDs
      const earnedSet = new Set(earnedData?.map((e) => e.badge_id) || []);

      setBadges(allBadges);
      setEarnedIds(earnedSet);
      setLoading(false);
    } catch (error) {
      clientLogger.error(
        "[BadgesDisplay] Error:",
        error instanceof Error ? error : undefined,
      );
      setBadges([]);
      setEarnedIds(new Set());
      setLoading(false);
    }
  };

  const getBadgeName = (badge: DisplayBadge) => {
    switch (language) {
      case "as":
        return badge.name_as;
      case "hi":
        return badge.name_hi;
      default:
        return badge.name_en;
    }
  };

  const earnedBadges = badges.filter((b) => earnedIds.has(b.id));
  const lockedBadges = badges.filter((b) => !earnedIds.has(b.id));
  const displayBadges = showAll ? badges : earnedBadges;

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`badge-skeleton-${i}`} className="animate-pulse">
            <div className="w-20 h-20 mx-auto bg-muted rounded-full" />
            <div className="h-4 bg-muted rounded mt-2 mx-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="flex justify-center gap-8 text-center">
        <div>
          <div className="text-3xl font-bold text-primary">
            {earnedBadges.length}
          </div>
          <div className="text-sm text-muted-foreground">Earned</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-muted-foreground">
            {lockedBadges.length}
          </div>
          <div className="text-sm text-muted-foreground">Locked</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-warning">
            {earnedBadges.reduce((sum, b) => sum + b.points_value, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Points</div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayBadges.map((badge) => {
          const isEarned = earnedIds.has(badge.id);
          const styles = RARITY_STYLES[badge.rarity];

          return (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${
                isEarned
                  ? `${styles.bg} ${styles.border} ${styles.glow} hover:scale-105`
                  : "bg-muted/50 border-dashed border-muted-foreground/30 opacity-60"
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`text-4xl mb-2 transition-transform ${
                  isEarned ? "group-hover:scale-110" : "grayscale"
                }`}
              >
                {badge.icon}
              </div>

              {/* Badge Name */}
              <div
                className={`text-sm font-medium ${isEarned ? styles.text : "text-muted-foreground"}`}
              >
                {getBadgeName(badge)}
              </div>

              {/* Rarity Indicator */}
              <div
                className={`text-xs mt-1 capitalize ${
                  isEarned ? styles.text : "text-muted-foreground"
                }`}
              >
                {badge.rarity}
              </div>

              {/* Lock Icon for Locked Badges */}
              {!isEarned && (
                <div className="absolute top-2 right-2 text-muted-foreground">
                  🔒
                </div>
              )}

              {/* Points */}
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                +{badge.points_value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-modal-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedBadge(null);
          }}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6 text-center">
              {/* Icon */}
              <div className="text-6xl mb-4">{selectedBadge.icon}</div>

              {/* Name in all languages */}
              <h3 id="badge-modal-title" className="text-xl font-bold">
                {selectedBadge.name_en}
              </h3>
              <p className="text-muted-foreground">{selectedBadge.name_as}</p>
              <p className="text-sm text-muted-foreground">
                {selectedBadge.name_hi}
              </p>

              {/* Description */}
              <p className="mt-4 text-sm">{selectedBadge.description}</p>

              {/* Cultural Note */}
              {selectedBadge.cultural_note && (
                <p className="mt-4 text-sm italic text-warning bg-warning/10 p-3 rounded-lg">
                  🏔️ {selectedBadge.cultural_note}
                </p>
              )}

              {/* Status */}
              <div className="mt-4">
                {earnedIds.has(selectedBadge.id) ? (
                  <span className="inline-block px-4 py-2 bg-success/10 text-success rounded-full font-medium">
                    ✓ Earned • +{selectedBadge.points_value} points
                  </span>
                ) : (
                  <span className="inline-block px-4 py-2 bg-muted text-muted-foreground rounded-full">
                    🔒 Locked
                  </span>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="mt-4 text-sm text-muted-foreground hover:text-primary"
                aria-label="Close badge details"
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Badge Display for Dashboard
 */
export function BadgesCompact({
  badges,
  maxDisplay = 5,
}: {
  readonly badges: Array<{ id: string; icon: string; name: string }>;
  readonly maxDisplay?: number;
}) {
  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      {displayBadges.map((badge) => (
        <div
          key={badge.id}
          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg"
          title={badge.name}
        >
          {badge.icon}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}
