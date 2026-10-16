import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { isTrustedMutationRequest } from "@/features/security/request-origin";
import { getAuthEnvironment } from "@/server/env-core";

async function getAdminSession(requestHeaders: Headers) {
  const { auth } = await import("@/server/auth");
  const session = await auth.api.getSession({ headers: requestHeaders });
  const roles = session?.user.role?.split(",").map((role) => role.trim()) ?? [];

  return session && roles.includes("admin") ? session : null;
}

export async function requireAdmin() {
  const requestHeaders = await headers();
  const { auth } = await import("@/server/auth");
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const roles = session.user.role?.split(",").map((role) => role.trim()) ?? [];

  if (!roles.includes("admin")) {
    notFound();
  }

  return session;
}

export async function requireAdminApi(request: Request) {
  if (!isTrustedMutationRequest(request, getAuthEnvironment().baseUrl)) return null;
  return getAdminSession(request.headers);
}
