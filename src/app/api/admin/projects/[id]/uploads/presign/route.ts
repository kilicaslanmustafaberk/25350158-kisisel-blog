import { randomUUID } from "node:crypto";

import { projectIdSchema, uploadRequestSchema } from "@/features/projects/validation";
import { badRequest, readJson, serverError, unauthorized } from "@/server/projects/http";
import { projectExists } from "@/server/projects/repository";
import { requireAdminApi } from "@/server/require-admin";
import { createPresignedUpload } from "@/server/storage/r2";
import { isR2Configured } from "@/server/storage/r2-env";
import { createUploadToken } from "@/server/storage/upload-token";

const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = projectIdSchema.safeParse((await params).id);
  const input = uploadRequestSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest("Yalnızca JPEG, PNG veya WebP ve en fazla 5 MB dosya kabul edilir.");
  try {
    if (!(await projectExists(id.data))) return Response.json({ error: "Proje bulunamadı." }, { status: 404 });
    if (!isR2Configured()) return Response.json({ error: "Medya depolaması yapılandırılmadı. R2 ayarlarını tamamlayın." }, { status: 503 });
    const key = `projects/${id.data}/${randomUUID()}.${extensions[input.data.mimeType]}`;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const [uploadUrl, uploadToken] = await Promise.all([
      createPresignedUpload(key, input.data.mimeType),
      Promise.resolve(createUploadToken({ scope: "projects", resourceId: id.data, key, mimeType: input.data.mimeType, expectedSize: input.data.size, expiresAt })),
    ]);
    return Response.json({ uploadUrl, uploadToken, expiresAt });
  } catch (error) {
    return serverError(error, "presign");
  }
}
