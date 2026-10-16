import { storedImageKeySchema } from "@/features/media/validation";

const developmentMediaEndpoint = "/api/media/r2";

export function imageDeliveryUrl(source: string, development = process.env.NODE_ENV === "development") {
  if (!development) return source;

  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".r2.dev")) return source;
    return `${developmentMediaEndpoint}?url=${encodeURIComponent(url.href)}`;
  } catch {
    return source;
  }
}

export function r2ObjectKeyFromPublicUrl(source: string, publicBaseUrl: string) {
  try {
    const sourceUrl = new URL(source);
    const baseUrl = new URL(publicBaseUrl.endsWith("/") ? publicBaseUrl : `${publicBaseUrl}/`);
    if (sourceUrl.origin !== baseUrl.origin || sourceUrl.search || sourceUrl.hash) return null;
    if (!sourceUrl.pathname.startsWith(baseUrl.pathname)) return null;

    const encodedKey = sourceUrl.pathname.slice(baseUrl.pathname.length);
    const key = encodedKey.split("/").map(decodeURIComponent).join("/");
    const result = storedImageKeySchema.safeParse(key);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
