import type { Metadata } from "next";
import {
  Nunito,
  Sora,
  Noto_Sans_Devanagari,
  Noto_Sans_Bengali,
} from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { MotionConfigProvider } from "@/components/providers/motion-config-provider";
import { Toaster } from "@/components/ui/sonner";
import { PageTransition } from "@/components/ui/page-transition";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { BackgroundSyncInitializer } from "@/components/offline/BackgroundSyncInitializer";
import { SyncCompletionToast } from "@/components/offline/SyncCompletionToast";
import { GlobalErrorBoundary } from "@/components/errors/GlobalErrorBoundary";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

/* ============================================
   ATAL AI - Jyoti Theme Typography (v5)

   Font Stack:
   - Display: Sora (headings, titles — geometric, modern, pairs well
              with the Indic scripts below)
   - Body:    Nunito (paragraphs, UI text — friendly, readable)
   - Hindi:   Noto Sans Devanagari
   - Assamese: Noto Sans Bengali

   All four use display:"swap" so text paints with a fallback font
   immediately and the brand font swaps in once loaded. next/font
   self-hosts the woff2 files at build time (no CLS from CSS request).
   ============================================ */

// Display font v5 — Sora (geometric, modern)
// `--font-display` (in globals.css) layers Sora on top of the old
// Baloo 2 fallback so old screens keep working during rollout.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Primary body font - Nunito (friendly, readable)
// SP13 Playful-Bento PR-1: weight 900 added for `font-black` chunky headlines
// (used by ChunkCard / BentoButton primitives across the redesigned screens).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Hindi font - Noto Sans Devanagari
const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Assamese font - Noto Sans Bengali
const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATAL AI - Digital Empowerment Platform",
  description:
    "Empowering education through AI & technology - Jyoti (ज्योति) brings light to learning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATAL AI",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "ATAL AI",
    "digital literacy",
    "education",
    "India",
    "Northeast",
    "Jyoti",
  ],
  authors: [{ name: "ATAL AI Team" }],
};

// Viewport configuration for PWA
// NOTE: themeColor requires a static hex value (CSS variables not supported by PWA spec)
// This value must match --color-primary in globals.css
export const viewport = {
  themeColor: "#F98819", // Must match --color-primary (#F98819) - PWA requirement
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // enables env(safe-area-inset-*) for notched / Dynamic Island devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* SP7 Phase A T-A3: Sora replaces Baloo 2 as the display font.
            Sora is loaded via next/font (self-hosted woff2, zero render-
            blocking external requests) and exposed as --font-sora.
            --font-display in globals.css uses Sora first with the old
            Baloo 2 fallback chain kept for backward compatibility. */}
      </head>
      <body
        className={`${sora.variable} ${nunito.variable} ${notoSansDevanagari.variable} ${notoSansBengali.variable} font-sans antialiased`}
        style={{
          fontFamily: "var(--font-nunito), 'Nunito', system-ui, sans-serif",
        }}
      >
        {/* Accessibility: Skip navigation link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <MotionConfigProvider>
              <GlobalErrorBoundary>
                <BackgroundSyncInitializer />
                <SyncCompletionToast />
                <OfflineBanner position="top" />
                <main id="main-content">
                  <PageTransition>{children}</PageTransition>
                </main>
                <Toaster />
              </GlobalErrorBoundary>
            </MotionConfigProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
