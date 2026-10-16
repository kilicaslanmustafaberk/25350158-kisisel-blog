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
  console.error(`[blog:${context}]`, {
    errorType: error instanceof Error ? error.name : typeof error,
  });
  return Response.json({ error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." }, { status: 500 });
}

export function refreshBlogPages(slug?: string, previousSlug?: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/blog/${previousSlug}`);
}

export function readJson(request: Request) {
  return readJsonWithLimit(request);
}
