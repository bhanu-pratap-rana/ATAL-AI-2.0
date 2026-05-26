/**
 * /app/admin/analytics — redirect to canonical performance dashboard.
 *
 * Admin "Analytics" tile and bottom nav both intend the performance
 * monitoring view; this alias prevents typed-URL miss (404) when an
 * admin guesses /app/admin/analytics.
 */

import { redirect } from "next/navigation";

export default function AdminAnalyticsAlias() {
  redirect("/app/admin/performance");
}
