import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://eu-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.loom.com",
              "font-src 'self'",
              "connect-src 'self' https://*.i.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io",
              "frame-src 'self' https://www.loom.com https://cal.com https://*.cal.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const sentryAuth = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

const sentryEnabled = Boolean(process.env.SENTRY_DSN && sentryAuth && sentryOrg && sentryProject);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: sentryOrg as string,
      project: sentryProject as string,
      authToken: sentryAuth as string,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
