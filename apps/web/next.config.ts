import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withPWA from 'next-pwa'

// PWA Configuration
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev for faster builds
  fallbacks: {
    document: '/offline', // Offline fallback page
  },
  runtimeCaching: [
    {
      // Cache API routes
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Cache static assets
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      // Cache fonts
      urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-fonts',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Cache Google Fonts
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
})

const nextConfig: NextConfig = {
  // Next.js 16 has instrumentation enabled by default
  // No experimental flags needed for Sentry integration

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy - prevent XSS and injection attacks
          // Note: 'unsafe-inline' for style-src is acceptable with proper Content-Type
          // Scripts are bundled by Next.js Turbopack (no unsafe-inline needed)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Script src: self only (Next.js handles bundling, no unsafe-inline)
              "script-src 'self' cdn.jsdelivr.net fonts.googleapis.com",
              // Style src: self + unsafe-inline only for Tailwind/CSS-in-JS generated styles
              // These are generated at build time, not dynamic user content
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              // WebSocket connections for real-time features
              "connect-src 'self' https: wss:",
              // No embedding in iframes
              "frame-ancestors 'self'",
              // Form submissions only to same origin
              "form-action 'self'",
              // Base URI restricted to prevent injection
              "base-uri 'self'",
              // Prevent object/embed elements (Flash, Java, etc.)
              "object-src 'none'",
              // Frame src for embedded iframes
              "frame-src 'self'",
              // Upgrade insecure requests to HTTPS
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Enable XSS filter in older browsers
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // HTTP Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Referrer Policy - privacy
          {
            key: 'Referrer-Policy',
            value: 'strict-no-referrer'
          },
          // Permissions Policy - control browser features
          {
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'camera=()',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'microphone=()',
              'payment=()',
              'usb=()'
            ].join(', ')
          },
          // Disable caching for sensitive content
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate'
          }
        ],
      }
    ]
  }
}

// Export config with Sentry wrapper (only if Sentry is configured)
// Apply PWA wrapper first, then Sentry
const configWithPWA = pwaConfig(nextConfig)

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithPWA, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: process.env.SENTRY_ORG || "atal-ai",
      project: process.env.SENTRY_PROJECT || "javascript-nextjs",

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // Upload a larger set of source maps for prettier stack traces
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
      tunnelRoute: "/monitoring",

      // Webpack plugin options
      webpack: {
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        treeshake: {
          removeDebugLogging: true,
        },
        // Enables automatic instrumentation of Vercel Cron Monitors
        automaticVercelMonitors: true,
      },
    })
  : configWithPWA;