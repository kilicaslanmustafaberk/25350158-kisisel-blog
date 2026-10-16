import { cvPdfFinalizeSchema, hasPdfSignature, maxCvPdfBytes } from "@/features/cv/uploaded-pdf";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { activateUploadedCv } from "@/server/cv/uploaded-pdf";
import { requireAdminApi } from "@/server/require-admin";
import { deleteUploadedObject, headUploadedObject, readUploadedObjectSignature } from "@/server/storage/r2";
import { verifyCvUploadToken } from "@/server/storage/upload-token";

function isMissingObject(error: unknown) {
  return typeof error === "object" && error !== null && "$metadata" in error
    && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;
}

async function discard(key: string) {
  await deleteUploadedObject(key).catch(() => console.error("[cv:pdf-cleanup] rejected object cleanup failed"));
}

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const input = cvPdfFinalizeSchema.safeParse(await readJson(request));
  if (!input.success) return badRequest();
  const token = verifyCvUploadToken(input.data.uploadToken);
  if (!token) return badRequest("Upload bileti geçersiz veya süresi dolmuş.");

  try {
    // The server, not the browser, decides whether the stored object is a real PDF.
    let head;
    try {
      head = await headUploadedObject(token.key);
    } catch (error) {
      if (isMissingObject(error)) return badRequest("Yüklenen dosya depolamada bulunamadı.");
      throw error;
    }
    const size = head.ContentLength ?? 0;
    const contentType = head.ContentType?.toLowerCase().split(";")[0]?.trim();
    if (contentType !== token.mimeType || size <= 0 || size > maxCvPdfBytes || size !== token.expectedSize) {
      await discard(token.key);
      return badRequest("Dosyanın türü veya boyutu beklenen değerle eşleşmedi.");
    }
    if (!hasPdfSignature(await readUploadedObjectSignature(token.key))) {
      await discard(token.key);
      return badRequest("Dosya içeriği geçerli bir PDF değil.");
    }

    let previousKey: string | null;
    try {
      previousKey = await activateUploadedCv({ key: token.key, originalName: token.originalName, size });
    } catch (databaseError) {
      // The previously active CV stays untouched; only the new object is discarded.
      await discard(token.key);
      throw databaseError;
    }
    // Only after the switch has committed: best-effort removal of the replaced object.
    if (previousKey) {
      await deleteUploadedObject(previousKey).catch(() => console.error("[cv:pdf-cleanup] previous CV cleanup failed"));
    }
    refreshCvPages();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return serverError(error, "pdf-finalize");
  }
}
