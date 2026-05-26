/**
 * Deterministic date / datetime formatters.
 *
 * Why this exists: `new Date(iso).toLocaleDateString()` inside a Server
 * Component uses the SERVER's runtime locale, while the same call on
 * rehydration in the browser uses the BROWSER's locale — which produces
 * "Text content did not match" hydration warnings on any page that
 * server-renders a date string. Pinning to `en-IN` here guarantees the
 * server and the client emit identical strings.
 *
 * Use these helpers everywhere a Server Component renders a stored
 * timestamp. Client components can still use `Intl.DateTimeFormat` with
 * the user's locale if they want to (no hydration drift there).
 */

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATE_LONG_FMT = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}

export function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_LONG_FMT.format(d);
}
