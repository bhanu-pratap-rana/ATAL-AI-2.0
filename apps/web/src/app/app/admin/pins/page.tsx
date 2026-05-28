/**
 * F-PROD-AD01 / AD02: PIN management lives at /app/admin/pins so it
 * sits inside the bento-chromed admin shell next to dashboard /
 * schools / performance. The (public) /admin/pins route is kept
 * working but redirects here via next.config redirects so existing
 * bookmarks and the admin login flow land on the canonical path.
 *
 * The page body is a thin re-export of the existing client component
 * so we don't duplicate ~150 lines of hook wiring.
 */
export { default } from "../../../(public)/admin/pins/page";
