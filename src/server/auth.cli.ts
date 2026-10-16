// Better Auth CLI cannot load modules marked with `server-only`.
// This non-route entry point reuses the exact runtime auth configuration.
export { auth } from "./auth-core";
