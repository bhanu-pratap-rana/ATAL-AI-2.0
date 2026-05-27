"use client";

// PR-67: input is milliseconds → seconds → "Xm Ys" / "Xs". The previous
// inline formatTime did the seconds conversion before delegating; the
// canonical helper takes seconds directly, so we convert at the call site.
import { formatDurationFromSeconds } from "@/lib/utils/format-date";

const formatTime = (ms: number) => formatDurationFromSeconds(Math.round(ms / 1000));

interface IRTCategoryScore {
  readonly theta: number;
  readonly score: number;
  readonly proficiency: string;
  readonly correct: number;
  readonly total: number;
}

interface IRTData {
  readonly theta: number;
  readonly standardError: number;
  readonly proficiencyLevel: string;
  readonly categoryScores: Record<string, IRTCategoryScore>;
}

interface AssessmentStatsProps {
  readonly avgResponseTime: number;
  readonly moduleBreakdown: Record<string, { total: number; correct: number }>;
  readonly irtData?: IRTData;
}

export function AssessmentStats({
  avgResponseTime,
  moduleBreakdown,
  irtData,
}: AssessmentStatsProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-black text-slate-800 mb-4">
        Quick Stats
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Response Time */}
        <div className="bg-primary-light p-4 rounded-2xl">
          <div className="text-xl sm:text-2xl font-black text-primary-dark">
            {formatTime(avgResponseTime)}
          </div>
          <div className="text-xs text-primary/80">
            Avg. Response Time
          </div>
        </div>

        {/* Modules Covered */}
        <div className="bg-success-light p-4 rounded-2xl">
          <div className="text-xl sm:text-2xl font-black text-success-dark">
            {Object.keys(moduleBreakdown).length}
          </div>
          <div className="text-xs text-success/80">Modules Covered</div>
        </div>
      </div>

      {/* IRT-Enhanced Stats — F-DATA-03: only show when the estimate is
          informative. A standard error above 1.0 means the IRT model has
          essentially no signal (e.g. student answered only 1 of 30 items);
          showing "Advanced" with ±22.53 SE is misleading. We surface a
          prompt to answer more items instead. */}
      {irtData && irtData.standardError <= 1 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-black text-slate-500 mb-3">
            Ability Estimate (IRT)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary-light p-3 rounded-2xl">
              <div className="text-xl font-black text-secondary-dark">
                θ = {irtData.theta.toFixed(2)}
              </div>
              <div className="text-xs text-secondary/80">
                Ability Score
              </div>
            </div>
            <div className="bg-warning-light p-3 rounded-2xl">
              <div className="text-xl font-black text-warning-dark">
                ±{irtData.standardError.toFixed(2)}
              </div>
              <div className="text-xs text-warning/80">
                Standard Error
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Your ability level:{" "}
            <span className="font-semibold">
              {irtData.proficiencyLevel}
            </span>
          </p>
        </div>
      )}
      {irtData && irtData.standardError > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            Answer a few more questions to estimate your skill level.
          </p>
        </div>
      )}
    </div>
  );
}
