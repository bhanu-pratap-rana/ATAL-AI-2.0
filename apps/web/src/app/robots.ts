/**
 * F-PROD-001: /robots.txt used to return the SPA fallback HTML with a
 * 404 status. Crawlers expect plain-text from this path. Next.js'
 * `robots.ts` file generates a real text/plain response automatically.
 *
 * App is behind noindex in <meta> on landing while we stabilise, but
 * we still emit a robots.txt so crawlers know which subpaths to skip
 * once the meta-robots is lifted.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://www.atalai.co.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/admin/", "/api/", "/student/start", "/teacher/start"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
