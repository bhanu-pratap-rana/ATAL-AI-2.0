/**
 * /ui-preview route gate.
 *
 * The page itself is a developer-only catalogue containing mock data
 * for visual review. The header comment has always claimed it's
 * "blocked in production" but no enforcement existed — anyone hitting
 * /ui-preview on the live deployment would see fake teacher / student /
 * class names that look like real data. This layout 404s the route
 * outside of `next dev`, closing the gap.
 */

import { notFound } from "next/navigation";

export default function UiPreviewLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <>{children}</>;
}
