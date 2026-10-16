import type { NextConfig } from "next";

import { buildContentSecurityPolicy } from "./src/features/security/headers";

function r2RemotePattern() {
  const value = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!value) {
    return [];
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return [];
    }

    const basePath = url.pathname.replace(/\/$/, "");

    return ["projects", "blog"].map((scope) => ({
      protocol: "https" as const,
      hostname: url.hostname,
      port: url.port,
      pathname: `${basePath}/${scope}/**`,
      search: "",
    }));
  } catch {
    return [];
  }
}

function r2UploadOrigin() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();

  if (!accountId || !bucketName) {
    return undefined;
  }

  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
}

const isDevelopment = process.env.NODE_ENV === "development";

const contentSecurityPolicy = buildContentSecurityPolicy({
  development: isDevelopment,
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  r2UploadOrigin: r2UploadOrigin(),
});

const nextConfig: NextConfig = {
  ...(isDevelopment && process.env.TEST_NEXT_ISOLATED === "1"
    ? { distDir: ".next-test" }
    : {}),

  poweredByHeader: false,

  outputFileTracingIncludes: {
    "/api/cv/pdf": ["./public/fonts/*.ttf"],
  },

  images: {
    remotePatterns: r2RemotePattern(),
    maximumRedirects: 0,
    unoptimized: isDevelopment,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(!isDevelopment
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000",
                },
              ]
            : []),
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;