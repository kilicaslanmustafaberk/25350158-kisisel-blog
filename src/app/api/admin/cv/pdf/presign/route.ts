import { randomUUID } from "node:crypto";

import { cvPdfMimeType, cvPdfUploadRequestSchema } from "@/features/cv/uploaded-pdf";
import { badRequest, readJson, serverError, unauthorized } from "@/server/cv/http";
import { requireAdminApi } from "@/server/require-admin";
import { createPresignedUpload } from "@/server/storage/r2";
import { isR2Configured } from "@/server/storage/r2-env";
import { createCvUploadToken } from "@/server/storage/upload-token";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const input = cvPdfUploadRequestSchema.safeParse(await readJson(request));
  if (!input.success) return badRequest("Yalnızca PDF dosyası ve en fazla 5 MB kabul edilir.");
  try {
    if (!isR2Configured()) return Response.json({ error: "Dosya depolaması yapılandırılmadı. R2 ayarlarını tamamlayın." }, { status: 503 });
    // Immutable object per upload; the active CV is only replaced after finalize verifies this one.
    const key = `cv/${randomUUID()}.pdf`;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const uploadUrl = await createPresignedUpload(key, cvPdfMimeType);
    const uploadToken = createCvUploadToken({
      scope: "cv", key, mimeType: cvPdfMimeType, expectedSize: input.data.size, originalName: input.data.fileName, expiresAt,
    });
    return Response.json({ uploadUrl, uploadToken, expiresAt });
  } catch (error) {
    return serverError(error, "pdf-presign");
  }
}
