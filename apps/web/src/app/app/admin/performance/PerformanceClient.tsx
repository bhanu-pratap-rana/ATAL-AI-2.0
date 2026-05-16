"use client";

import { useEffect, useState } from "react";
import { queryMonitor } from "@/lib/supabase-query-wrapper";
import { connectionPoolMonitor } from "@/lib/monitoring/connection-pool-monitor";
import type { ConnectionPoolMetrics, PoolAlert } from "@/types/monitoring";
import { AlertCircle, CheckCircle2, Microscope, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

import { BentoCard } from "@/components/ui/bento-card";
function getAlertClassName(level: string): string {
  switch (level) {
    case "critical":
      return "border-red-500 bg-red-50 text-red-700";
    case "error":
      return "border-orange-500 bg-orange-50 text-orange-700";
    default:
      return "border-amber-400 bg-amber-50 text-amber-700";
  }
}

interface UtilizationColors {
  readonly textClass: string;
  readonly barClass: string;
}

function getUtilizationColors(percent: number): UtilizationColors {
  if (percent > 85) {
    return { textClass: "text-red-600", barClass: "bg-red-500" };
  }
  if (percent > 70) {
    return { textClass: "text-amber-600", barClass: "bg-amber-400" };
  }
  return { textClass: "text-emerald-600", barClass: "bg-emerald-500" };
}

export function PerformanceClient() {
  // `lastUpdated` is rendered as a locale time string. Initialising it from
  // `new Date()` on render would cause a hydration mismatch because the
  // server and client locale defaults differ (12-hour PM vs 24-hour).
  // Start as empty on the server / first client render, then seed on mount
  // — the empty placeholder hydrates cleanly and the visible value is set
  // by the first effect tick.
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [stats, setStats] = useState(queryMonitor.getStats());
  const [slowQueries, setSlowQueries] = useState(
    queryMonitor.getSlowestQueries(10),
  );
  const [failedQueries, setFailedQueries] = useState(
    queryMonitor.getFailedQueries(10),
  );
  const [poolMetrics, setPoolMetrics] = useState<ConnectionPoolMetrics | null>(
    null,
  );
  const [poolAlerts, setPoolAlerts] = useState<PoolAlert[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    // Seed the timestamp asynchronously after mount so initial HTML
    // hydrates without mismatching the SSR-empty placeholder, and so
    // the seed doesn't trip react-hooks/set-state-in-effect.
    queueMicrotask(() => setLastUpdated(new Date().toLocaleTimeString()));

    const interval = setInterval(async () => {
      setStats(queryMonitor.getStats());
      setSlowQueries(queryMonitor.getSlowestQueries(10));
      setFailedQueries(queryMonitor.getFailedQueries(10));
      setLastUpdated(new Date().toLocaleTimeString());

      const metrics = await connectionPoolMonitor.getMetrics();
      if (metrics) {
        setPoolMetrics(metrics);
      }

      const alert = await connectionPoolMonitor.checkHealth();
      if (alert) {
        setPoolAlerts(connectionPoolMonitor.getRecentAlerts(10));
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Banner */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-2 pb-1">
          <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F] inline-flex items-center gap-2">
            <Microscope className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            Performance Monitoring
          </h1>
          {/* `suppressHydrationWarning` is defence-in-depth; the value is now
              set on the client via useEffect so SSR always renders empty. */}
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest" suppressHydrationWarning>
            {lastUpdated ? `Updated ${lastUpdated}` : " "}
          </p>
        </div>

        {/* Query Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats.totalQueries, label: "Total Queries", sub: `${stats.successfulQueries} success, ${stats.failedQueries} failed`, color: "text-blue-600" },
            { value: stats.slowQueries, label: "Slow Queries >1s", sub: `${((stats.slowQueries / Math.max(stats.totalQueries, 1)) * 100).toFixed(1)}% of total`, color: "text-amber-600" },
            { value: `${stats.avgDuration.toFixed(0)}ms`, label: "Avg Duration", sub: `P95: ${stats.p95Duration.toFixed(0)}ms`, color: "text-slate-700" },
            { value: `${stats.p99Duration.toFixed(0)}ms`, label: "P99 Duration", sub: "Slowest 1% of queries", color: "text-red-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 text-center">
              <p className={`text-xl sm:text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-[11px] font-bold text-slate-300 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Connection Pool Stats */}
        {poolMetrics && (
          <BentoCard padding="lg">
            <h2 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" /> Connection Pool Status
            </h2>
            <div className="grid grid-cols-3 gap-6 mb-4">
              {[
                { value: poolMetrics.activeConnections, label: "Active Connections" },
                { value: poolMetrics.maxConnections, label: "Max Connections" },
                { value: `${poolMetrics.utilizationPercent.toFixed(1)}%`, label: "Utilization", colored: true },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className={`text-xl sm:text-2xl font-black ${item.colored ? getUtilizationColors(poolMetrics.utilizationPercent).textClass : "text-slate-700"}`}>{item.value}</p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getUtilizationColors(poolMetrics.utilizationPercent).barClass}`}
                style={{ width: `${poolMetrics.utilizationPercent}%` }}
              />
            </div>
          </BentoCard>
        )}

        {/* Pool Alerts */}
        {poolAlerts.length > 0 && (
          <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
            <h2 className="font-black text-red-600 text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Connection Pool Alerts
            </h2>
            <div className="space-y-3">
              {poolAlerts.slice(0, 5).map((alert, idx) => (
                <div
                  key={`pool-alert-${idx}-${alert.timestamp}`}
                  className={`p-3 rounded-2xl border-l-4 ${getAlertClassName(alert.level)}`}
                >
                  <p className="font-black text-sm">{alert.message}</p>
                  <p className="text-xs font-bold mt-1 opacity-70">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slow Queries Log */}
        <BentoCard padding="lg">
          <h2 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-500" /> Slowest Queries (&gt; 1 second)
          </h2>
          {slowQueries.length === 0 ? (
            <p className="text-emerald-700 font-black flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
              No slow queries detected
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {slowQueries.map((query, idx) => (
                <div key={`slow-query-${idx}-${query.queryName}`} className="border-l-4 border-amber-400 pl-4 py-3 bg-amber-50 rounded-r-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm text-slate-700">{query.queryName}</p>
                      {query.tableNames && query.tableNames.length > 0 && (
                        <p className="text-xs font-bold text-slate-400 mt-1">Tables: {query.tableNames.join(", ")}</p>
                      )}
                    </div>
                    <span className="text-red-500 font-black text-sm">{query.duration.toFixed(0)}ms</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-1">{new Date(query.timestamp).toLocaleString()}</p>
                  {query.userId && <p className="text-xs font-bold text-slate-400">User: {query.userId}</p>}
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        {/* Failed Queries Log */}
        {failedQueries.length > 0 && (
          <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
            <h2 className="font-black text-red-600 text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Failed Queries
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {failedQueries.map((query, idx) => (
                <div key={`failed-query-${idx}-${query.queryName}`} className="border-l-4 border-red-400 pl-4 py-3 bg-red-50 rounded-r-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm text-slate-700">{query.queryName}</p>
                      {query.error && <p className="text-xs font-bold text-red-500 mt-1">{query.error}</p>}
                    </div>
                    <span className="text-slate-400 font-bold text-xs">{query.duration.toFixed(0)}ms</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-1">{new Date(query.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitoring Settings */}
        <BentoCard padding="lg">
          <h2 className="font-black text-slate-800 text-lg mb-4">Monitoring Settings</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label htmlFor="refresh-interval-select" className="text-xs font-black text-slate-400 uppercase tracking-widest">Refresh Interval</label>
              <select
                id="refresh-interval-select"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="mt-2 block px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                queryMonitor.reset();
                connectionPoolMonitor.clearAlerts();
                setSlowQueries([]);
                setFailedQueries([]);
              }}
              className="text-slate-600 font-black mt-6"
            >
              Clear Metrics
            </Button>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
