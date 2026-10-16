import "server-only";

import { parseR2TestEndpoint } from "@/features/media/r2-test-endpoint";

export type R2Environment = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
};

export function isR2Configured(): boolean {
  return ["R2_PUBLIC_BASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
    .every((name) => Boolean(process.env[name]?.trim()));
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for R2 operations.`);
  return value;
}

/** Loopback S3 mock for the upload regression; ignored in production (see parseR2TestEndpoint). */
export function getR2TestEndpoint(): string | undefined {
  return parseR2TestEndpoint(process.env.R2_TEST_ENDPOINT, process.env.NODE_ENV);
}

export function getR2Environment(): R2Environment {
  const publicBaseUrl = required("R2_PUBLIC_BASE_URL");
  let publicUrl: URL;
  try {
    publicUrl = new URL(publicBaseUrl);
  } catch {
    throw new Error("R2_PUBLIC_BASE_URL must be a valid absolute URL.");
  }
  if (publicUrl.protocol !== "https:") throw new Error("R2_PUBLIC_BASE_URL must use HTTPS.");
  if (publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) {
    throw new Error("R2_PUBLIC_BASE_URL must not contain credentials, query or fragment.");
  }
  if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(publicUrl.hostname)) {
    throw new Error("R2_PUBLIC_BASE_URL cannot target localhost in production.");
  }
  return {
    accountId: required("R2_ACCOUNT_ID"),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    bucketName: required("R2_BUCKET_NAME"),
    publicBaseUrl: publicUrl.toString().replace(/\/$/, ""),
  };
}
