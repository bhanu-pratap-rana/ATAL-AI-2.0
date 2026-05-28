/**
 * F-PROD-002: /sitemap.xml used to 404. This emits a minimal sitemap
 * covering the public-facing surfaces. App pages (/app/*, /admin/*)
 * are intentionally excluded — they require auth and have no SEO
 * value to crawlers.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://www.atalai.co.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/student/start`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/teacher/start`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/join`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/admin/login`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
