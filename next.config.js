/** @type {import('next').NextConfig} */

// Content Security Policy.
//
// Shipped in REPORT-ONLY mode on the first pass. The site uses a lot of inline
// styles (every premium panel is a style object), Next.js injects inline
// bootstrap script, and GA4 loads from googletagmanager.com, so an enforcing
// policy has real breakage potential that cannot be confirmed from a build
// alone. Watch the browser console for `Content-Security-Policy-Report-Only`
// violations on the live site, then switch the header name to
// `Content-Security-Policy` once it is quiet. See MAINTENANCE.md.
//
// GA4 stays, per Samuel's decision, so googletagmanager.com and
// google-analytics.com are allowed.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' and 'unsafe-eval' are required by the Next.js App Router
  // client bootstrap. googletagmanager is GA4.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
  // Next.js and the components inject inline style attributes throughout.
  "style-src 'self' 'unsafe-inline'",
  // NASA imagery (APOD, EPIC), Amazon product images, GA4 tracking pixels.
  "img-src 'self' data: blob: https://apod.nasa.gov https://epic.gsfc.nasa.gov https://*.nasa.gov https://*.media-amazon.com https://*.ssl-images-amazon.com https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  // The client fetches only same-origin /api routes. GA4 beacons out.
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
  "frame-src 'self' https://www.youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  // Checkout posts nowhere directly; Stripe redirects are top-level navigations.
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  {
    // Report-only for now. Rename to 'Content-Security-Policy' to enforce.
    key: 'Content-Security-Policy-Report-Only',
    value: CSP,
  },
  {
    // Redundant with frame-ancestors above, kept for older browsers.
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Two years, subdomains included, preload-eligible. Netlify terminates TLS
    // for portalastra.com so there is no plain-HTTP origin to lock out.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'apod.nasa.gov' },
      { protocol: 'https', hostname: 'epic.gsfc.nasa.gov' },
      { protocol: 'https', hostname: 'www.youtube.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
