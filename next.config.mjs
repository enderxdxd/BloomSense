const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Allowances beyond 'self':
// - Stripe JS + Elements iframes (checkout, Phase 11)
// - Supabase REST/realtime + storage images (Phases 8/13)
// - Replicate + DALL-E image CDNs, data:/blob: for b64 previews
// - 'unsafe-inline' scripts: required by Next.js bootstrap without a
//   nonce setup; 'unsafe-eval' only in dev (react-refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://replicate.delivery https://oaidalleapiprodscus.blob.core.windows.net",
  "font-src 'self' data:",
  `connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co${isDev ? " ws:" : ""}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
