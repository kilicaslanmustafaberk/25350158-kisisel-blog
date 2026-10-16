// Phase 7 navigation allowlist. Command palette, terminal and footer links only
// navigate to destinations that pass these checks; arbitrary user input is never
// turned into a URL.

export type SafeDestination = { href: string; external: boolean };

const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/%]*(?:#[A-Za-z0-9\-_]+)?$/;

/** Internal same-origin path such as `/projects/foo` or `/#contact`. */
export function isSafeInternalPath(value: string): boolean {
  return INTERNAL_PATH.test(value) && !value.includes("\\") && !value.includes("..");
}

/** External link: HTTPS only, no embedded credentials. */
export function toSafeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function toSafeDestination(href: string, external: boolean): SafeDestination | null {
  if (external) {
    const url = toSafeExternalUrl(href);
    return url ? { href: url, external: true } : null;
  }
  return isSafeInternalPath(href) ? { href, external: false } : null;
}

/** Builds `/projects/<slug>` or `/blog/<slug>` from a stored slug, rejecting anything unexpected. */
export function contentPath(base: "/projects" | "/blog", slug: string): string | null {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? `${base}/${slug}` : null;
}
