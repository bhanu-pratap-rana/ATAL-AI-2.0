"use client";

/**
 * Offline Fallback Page — PWA + Playful-Bento
 *
 * Displayed when the user is offline and the requested page is not
 * cached. SP13 PR-8: refactored to match the Playful-Bento look from
 * the rest of the app — chunky double-shadow card with a 4px white
 * border, btn-bento style CTAs that press down on :active.
 *
 * SP13 PR-9: professional icons (lucide-react SVGs) replace the
 * cartoon emojis. Lottie isn't an option here because it would need
 * to fetch animation JSON — defeats the purpose of an offline page.
 * Lucide icons inline as static SVG at build time → zero runtime
 * network deps, render even when the bundle is the only thing the
 * service worker delivers.
 *
 * IMPORTANT: this page still uses INLINE STYLES ONLY for the layout
 * + colors. The PWA service worker serves it from cache even when
 * globals.css can't be fetched (the whole point — you're offline).
 * That's why every bento token has a hex fallback below.
 */

import {
  Home,
  RefreshCw,
  Satellite,
  WifiOff,
  Sparkles,
} from "lucide-react";

// Bento token fallbacks for when globals.css is not loaded. Keep in
// sync with apps/web/src/app/globals.css (`:root` block).
const BENTO = {
  bg: "#FFFBF5", // --bento-bg
  orange: "#FF8A3D", // --bento-orange
  orangeDark: "#E66A1A", // --bento-orange-d
  surface: "#FFFFFF",
  ink: "#231C2E",
  inkSoft: "#4B5563",
  inkMuted: "#94A3B8",
  greyShadow: "#CFCAC0",
  greyBorder: "#EDEAE2",
  error: "#EF4444",
  shadowChunk:
    "0 6px 0 rgba(0, 0, 0, 0.06), 0 14px 28px -10px rgba(0, 0, 0, 0.12)",
} as const;

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 5vw, 2rem)",
        fontFamily: 'var(--font-body, "Nunito", system-ui, sans-serif)',
        backgroundColor: `var(--bento-bg, ${BENTO.bg})`,
        paddingTop:
          "max(env(safe-area-inset-top, 0px), clamp(1rem, 5vw, 2rem))",
        paddingBottom:
          "max(env(safe-area-inset-bottom, 0px), clamp(1rem, 5vw, 2rem))",
        paddingLeft:
          "max(env(safe-area-inset-left, 0px), clamp(1rem, 5vw, 2rem))",
        paddingRight:
          "max(env(safe-area-inset-right, 0px), clamp(1rem, 5vw, 2rem))",
      }}
    >
      {/* Chunky bento card */}
      <div
        style={{
          width: "100%",
          maxWidth: "min(420px, 92vw)",
          textAlign: "center",
          padding: "clamp(1.75rem, 5vw, 2.5rem)",
          backgroundColor: BENTO.surface,
          border: "4px solid #ffffff",
          borderRadius: "1.75rem",
          boxShadow: `var(--shadow-chunk, ${BENTO.shadowChunk})`,
          position: "relative",
        }}
      >
        {/* Satellite icon — rotating "signal" waves drawn as concentric
            arcs that fade out, telling the user "we're trying to reach
            you". Pure CSS, no animation library needed. */}
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            width: "clamp(5rem, 16vw, 6rem)",
            height: "clamp(5rem, 16vw, 6rem)",
            margin: "0 auto clamp(1rem, 2.5vw, 1.25rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Animated signal rings (3 ripples) */}
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              border: `2px solid ${BENTO.orange}`,
              opacity: 0,
              animation: "offlinePulseRing 2.4s ease-out infinite",
              animationDelay: "0s",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              border: `2px solid ${BENTO.orange}`,
              opacity: 0,
              animation: "offlinePulseRing 2.4s ease-out infinite",
              animationDelay: "0.8s",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              border: `2px solid ${BENTO.orange}`,
              opacity: 0,
              animation: "offlinePulseRing 2.4s ease-out infinite",
              animationDelay: "1.6s",
            }}
          />

          {/* Center disc holding the icon */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "9999px",
              backgroundColor: "#FFE2A0",
              border: "3px solid #ffffff",
              boxShadow: "0 4px 0 rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BENTO.orangeDark,
            }}
          >
            <Satellite
              size={36}
              strokeWidth={2.25}
              aria-hidden="true"
            />
          </div>
        </div>

        <h1
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 900,
            color: BENTO.ink,
            margin: 0,
            marginBottom: "0.5rem",
            fontFamily: 'var(--font-display, "Nunito", system-ui, sans-serif)',
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          You&apos;re Offline
        </h1>

        <p
          style={{
            color: BENTO.inkSoft,
            margin: 0,
            marginBottom: "clamp(1.25rem, 3.5vw, 1.75rem)",
            fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
            fontWeight: 700,
            lineHeight: 1.5,
            maxWidth: "32ch",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Check your internet connection and try again. Don&apos;t worry —
          your cached lessons still work.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
          }}
        >
          {/* Primary: chunky orange "Try Again" */}
          <button
            type="button"
            onClick={() => globalThis.location.reload()}
            style={{
              width: "100%",
              minHeight: "3rem",
              padding: "0.875rem 1.25rem",
              backgroundColor: BENTO.orange,
              color: "#ffffff",
              border: "none",
              borderRadius: "1rem",
              fontSize: "clamp(1rem, 2.5vw, 1.0625rem)",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: `0 5px 0 ${BENTO.orangeDark}`,
              transition:
                "transform 150ms cubic-bezier(.34, 1.56, .64, 1), box-shadow 150ms ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = `0 2px 0 ${BENTO.orangeDark}`;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 5px 0 ${BENTO.orangeDark}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 5px 0 ${BENTO.orangeDark}`;
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = `0 2px 0 ${BENTO.orangeDark}`;
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 5px 0 ${BENTO.orangeDark}`;
            }}
          >
            <RefreshCw size={18} strokeWidth={2.5} aria-hidden="true" />
            Try Again
          </button>

          {/* Secondary: chunky white "Go Home" */}
          <button
            type="button"
            onClick={() => {
              globalThis.location.href = "/";
            }}
            style={{
              width: "100%",
              minHeight: "3rem",
              padding: "0.875rem 1.25rem",
              backgroundColor: "#ffffff",
              color: BENTO.ink,
              border: `3px solid ${BENTO.greyBorder}`,
              borderRadius: "1rem",
              fontSize: "clamp(1rem, 2.5vw, 1.0625rem)",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: `0 5px 0 ${BENTO.greyShadow}`,
              transition:
                "transform 150ms cubic-bezier(.34, 1.56, .64, 1), box-shadow 150ms ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = `0 2px 0 ${BENTO.greyShadow}`;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 5px 0 ${BENTO.greyShadow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 5px 0 ${BENTO.greyShadow}`;
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = `0 2px 0 ${BENTO.greyShadow}`;
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 5px 0 ${BENTO.greyShadow}`;
            }}
          >
            <Home size={18} strokeWidth={2.5} aria-hidden="true" />
            Go to Home
          </button>
        </div>

        {/* Info Text */}
        <p
          style={{
            margin: "clamp(1.25rem, 3.5vw, 1.75rem) 0 0",
            fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
            color: BENTO.inkMuted,
            lineHeight: 1.5,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "0.375rem",
          }}
        >
          <Sparkles
            size={14}
            strokeWidth={2.5}
            aria-hidden="true"
            style={{ color: BENTO.orange }}
          />
          <span>
            Cached lessons may still be available.
            <br />
            <strong style={{ color: BENTO.orange, fontWeight: 900 }}>
              ATAL AI
            </strong>{" "}
            — Learning continues offline
          </span>
        </p>
      </div>

      {/* Network status pill */}
      <output
        style={{
          position: "fixed",
          bottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: "rgba(35, 28, 46, 0.92)",
          color: "#ffffff",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 800,
          border: "2px solid #ffffff",
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
        }}
        aria-live="polite"
      >
        <WifiOff
          size={14}
          strokeWidth={2.5}
          aria-hidden="true"
          style={{ color: BENTO.error }}
        />
        <span>No Internet Connection</span>
      </output>

      {/* Inline keyframes — survive without globals.css */}
      <style>{`
        @keyframes offlinePulseRing {
          0%   { opacity: 0.6; transform: scale(1); }
          80%  { opacity: 0;   transform: scale(1.6); }
          100% { opacity: 0;   transform: scale(1.6); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="offlinePulseRing"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
