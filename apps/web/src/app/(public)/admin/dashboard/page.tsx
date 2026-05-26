/**
 * Legacy admin dashboard route.
 *
 * The canonical admin home is `/app/admin/dashboard`. This 182-line
 * client page used to render a separate dashboard with System Overview
 * tiles + Manage Admins/PINs panels; it drifted from `/app/admin/dashboard`
 * (Pending Approvals + Manage Schools / Analytics / PIN Management cards).
 * Per the SP14 audit, the duplication is collapsed by redirecting here.
 *
 * Direct destinations remain reachable: `/admin/admins`, `/admin/pins`,
 * `/app/admin/schools`, `/app/admin/performance`.
 */

import { redirect } from "next/navigation";

export default function LegacyAdminDashboardRedirect() {
  redirect("/app/admin/dashboard");
}
