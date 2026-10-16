function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(options: {
  development: boolean;
  r2PublicBaseUrl?: string;
  r2UploadOrigin?: string;
}) {
  const imageSources = ["'self'", "data:", "blob:"];
  const connectSources = ["'self'"];

  const r2PublicOrigin = normalizeOrigin(options.r2PublicBaseUrl);
  if (r2PublicOrigin) {
    imageSources.push(r2PublicOrigin);
  }

  const r2UploadOrigin = normalizeOrigin(options.r2UploadOrigin);
  if (r2UploadOrigin) {
    connectSources.push(r2UploadOrigin);
  }

  if (options.development) {
    connectSources.push("ws:", "wss:");
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${options.development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
  ];

  if (!options.development) {
    directives.push("upgrade-insecure-requests");
  }

  return `${directives.join("; ")};`;
}