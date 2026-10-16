import { randomUUID } from "node:crypto";

import { imageExtensionByMimeType, uploadRequestSchema } from "@/features/media/validation";
import { postIdSchema } from "@/features/blog/validation";
import { badRequest, readJson, serverError, unauthorized } from "@/server/blog/http";
import { postExists } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";
import { createPresignedUpload } from "@/server/storage/r2";
import { isR2Configured } from "@/server/storage/r2-env";
import { createUploadToken } from "@/server/storage/upload-token";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = postIdSchema.safeParse((await params).id);
  const input = uploadRequestSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest("Yalnızca JPEG, PNG veya WebP ve en fazla 5 MB dosya kabul edilir.");
  try {
    if (!(await postExists(id.data))) return Response.json({ error: "Yazı bulunamadı." }, { status: 404 });
    if (!isR2Configured()) return Response.json({ error: "Medya depolaması yapılandırılmadı. R2 ayarlarını tamamlayın." }, { status: 503 });
    const key = `blog/${id.data}/${randomUUID()}.${imageExtensionByMimeType[input.data.mimeType]}`;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const [uploadUrl, uploadToken] = await Promise.all([
      createPresignedUpload(key, input.data.mimeType),
      Promise.resolve(createUploadToken({ scope: "blog", resourceId: id.data, key, mimeType: input.data.mimeType, expectedSize: input.data.size, expiresAt })),
    ]);
    return Response.json({ uploadUrl, uploadToken, expiresAt });
  } catch (error) {
    return serverError(error, "presign");
  }
}
