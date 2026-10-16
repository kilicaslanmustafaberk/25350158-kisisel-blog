import "server-only";

import { revalidatePath } from "next/cache";

import { readJsonWithLimit } from "@/features/security/read-json";

export function unauthorized() {
  return Response.json({ error: "Bu işlem için yönetici oturumu gereklidir." }, { status: 401 });
}

export function badRequest(message = "Gönderilen bilgiler geçerli değil.", details?: unknown) {
  return Response.json({ error: message, details }, { status: 400 });
}

export function serverError(error: unknown, context: string) {
  console.error(`[projects:${context}]`, {
    errorType: error instanceof Error ? error.name : typeof error,
  });
  return Response.json({ error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." }, { status: 500 });
}

export function refreshProjectPages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  if (slug) revalidatePath(`/projects/${slug}`);
}

export function readJson(request: Request) {
  return readJsonWithLimit(request);
}
