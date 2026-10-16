type DatabaseEnvironment = {
  url: string;
  authToken?: string;
};

type AuthEnvironment = {
  baseUrl: string;
  secret: string;
};

function readRequired(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required at runtime.`);
  }

  return value;
}

export function getDatabaseEnvironment(): DatabaseEnvironment {
  const url = readRequired("TURSO_DATABASE_URL");
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const isLocalDatabase = url.startsWith("file:");

  if (!isLocalDatabase) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("TURSO_DATABASE_URL must be a valid libSQL URL.");
    }
    if (!["libsql:", "https:", "wss:"].includes(parsed.protocol)) {
      throw new Error("TURSO_DATABASE_URL must use file, libsql, https or wss.");
    }
    if (parsed.username || parsed.password) {
      throw new Error("TURSO_DATABASE_URL credentials must be provided through TURSO_AUTH_TOKEN.");
    }
    if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      throw new Error("TURSO_DATABASE_URL cannot target localhost in production.");
    }
  }

  if (process.env.NODE_ENV === "production" && isLocalDatabase) {
    throw new Error("A local file database cannot be used in production.");
  }

  if (!isLocalDatabase && !authToken) {
    throw new Error("TURSO_AUTH_TOKEN is required for a remote database.");
  }

  return { url, authToken };
}

export function getAuthEnvironment(): AuthEnvironment {
  const baseUrl = readRequired("BETTER_AUTH_URL");
  const secret = readRequired("BETTER_AUTH_SECRET");

  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
    throw new Error("BETTER_AUTH_URL must use http or https.");
  }

  if (process.env.NODE_ENV === "production" && parsedBaseUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use https in production.");
  }

  if (parsedBaseUrl.username || parsedBaseUrl.password || parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new Error("BETTER_AUTH_URL must be a clean origin without credentials, query or fragment.");
  }
  if (parsedBaseUrl.pathname !== "/") {
    throw new Error("BETTER_AUTH_URL must be an origin without a path.");
  }

  if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(parsedBaseUrl.hostname)) {
    throw new Error("BETTER_AUTH_URL cannot target localhost in production.");
  }

  return { baseUrl: parsedBaseUrl.origin, secret };
}
