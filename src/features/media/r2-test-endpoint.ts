/**
 * Test seam for the automated CV upload regression: a local S3-compatible mock endpoint.
 * Honoured only outside production and only for loopback HTTP origins, so it can never
 * redirect real storage traffic in a deployed build.
 */
export function parseR2TestEndpoint(value: string | undefined, nodeEnv: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || nodeEnv === "production") return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/") return undefined;
    if (url.username || url.password || url.search || url.hash) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
