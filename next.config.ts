import type { NextConfig } from "next";

/**
 * Framing policy.
 *
 * Default is the hardened production posture: the app may not be embedded in
 * any cross-origin frame. Set FRAME_ANCESTORS to opt in to embedding — this is
 * what makes the app viewable inside a sandbox/preview iframe (E2B, Vercel
 * preview panels, Storybook, etc.).
 *
 *   FRAME_ANCESTORS="'self'"                 -> DENY everything else (default)
 *   FRAME_ANCESTORS="'self' https://arena.ai"-> allow one parent origin
 *   FRAME_ANCESTORS="*"                      -> allow any parent (PREVIEW ONLY)
 *
 * Never ship "*" to an environment holding real patient data: clickjacking a
 * health record UI is a genuine risk. Keep the default in production.
 */
const frameAncestors = (process.env.FRAME_ANCESTORS?.trim() || "'self'")
  .split(/\s+/)
  .filter(Boolean);

const allowsCrossOriginFraming = frameAncestors.some((origin) => origin !== "'self'");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // X-Frame-Options cannot express an allowlist, and CSP frame-ancestors
  // supersedes it in every browser that matters. Emit it only when we are in
  // the locked-down default, so the two headers never contradict each other.
  ...(allowsCrossOriginFraming
    ? []
    : [{ key: "X-Frame-Options", value: "DENY" as const }]),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router injects inline flight/hydration scripts.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Preview/proxy hosts serve the app from a different origin than the
      // bundle URLs it requests; keep this same-origin by default.
      "connect-src 'self'",
      // pdf.js / tesseract.js spawn workers from blobs.
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${frameAncestors.join(" ")}`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pdfjs-dist", "tesseract.js", "postgres"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
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
