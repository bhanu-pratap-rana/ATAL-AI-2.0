/**
 * Health Check Endpoint
 *
 * Returns operational status of the app and its critical dependencies
 * (Supabase, Redis). Used by load balancers, uptime monitors, and
 * the deployment platform's readiness checks.
 *
 * Conventions:
 * - 200: all critical checks pass
 * - 503: at least one critical dependency is unhealthy
 * - Response body is intentionally small (no secrets, no PII)
 * - No-store cache header so monitors always hit a fresh check
 *
 * Per SP11 T11.4 in the master execution plan.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { Redis } from "ioredis";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "degraded" | "down" | "skipped";

interface CheckResult {
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
}

interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    db: CheckResult;
    redis: CheckResult;
  };
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true });
    if (error) {
      return { status: "down", latencyMs: Date.now() - start, error: error.message };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const url = process.env.REDIS_URL;
  if (!url) {
    // Not configured — rate limiter falls back to in-memory; not a failure
    return { status: "skipped" };
  }

  const start = Date.now();
  const client = new Redis(url, {
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
  });

  try {
    const reply = await client.ping();
    const latencyMs = Date.now() - start;
    if (reply !== "PONG") {
      return { status: "degraded", latencyMs, error: `unexpected reply: ${reply}` };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown error",
    };
  } finally {
    client.disconnect();
  }
}

export async function GET() {
  const [db, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  // DB is the only hard dependency. Redis is optional (in-memory fallback exists).
  const overall: HealthReport["status"] = db.status === "ok" ? "ok" : "degraded";

  const report: HealthReport = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: { db, redis },
  };

  return NextResponse.json(report, {
    status: overall === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
