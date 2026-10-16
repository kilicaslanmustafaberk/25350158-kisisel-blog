const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isTrustedMutationRequest(request: Request, trustedOrigin: string) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(trustedOrigin).origin;
    } catch {
      return false;
    }
  }

  // Browsers expose cross-site context even in the uncommon cases where an
  // Origin header is absent. Header-less requests remain available to trusted
  // CLI/server-to-server clients and the integration-test harness.
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin" || fetchSite === "none";
}

