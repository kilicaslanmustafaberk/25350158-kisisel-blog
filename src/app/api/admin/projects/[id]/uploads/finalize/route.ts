import { hasValidImageSignature } from "@/features/media/validation";
import { projectIdSchema, uploadFinalizeSchema, maxProjectImageBytes } from "@/features/projects/validation";
import { badRequest, readJson, refreshProjectPages, serverError, unauthorized } from "@/server/projects/http";
import { attachUploadedImage, getAdminProject, projectExists } from "@/server/projects/repository";
import { requireAdminApi } from "@/server/require-admin";
import { deleteUploadedObject, headUploadedObject, publicObjectUrl, readUploadedObjectSignature } from "@/server/storage/r2";
import { verifyUploadToken } from "@/server/storage/upload-token";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = projectIdSchema.safeParse((await params).id);
  const input = uploadFinalizeSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest(undefined, input.error?.flatten().fieldErrors);
  const token = verifyUploadToken(input.data.uploadToken, "projects", id.data);
  if (!token) return badRequest("Upload bileti geçersiz veya süresi dolmuş.");

  try {
    if (!(await projectExists(id.data))) return Response.json({ error: "Proje bulunamadı." }, { status: 404 });
    const head = await headUploadedObject(token.key);
    const size = head.ContentLength ?? 0;
    const contentType = head.ContentType?.toLowerCase();
    if (contentType !== token.mimeType || size <= 0 || size > maxProjectImageBytes || size !== token.expectedSize) {
      await deleteUploadedObject(token.key);
      return badRequest("R2 nesnesinin MIME türü veya boyutu beklenen değerle eşleşmedi.");
    }
    const signature = await readUploadedObjectSignature(token.key);
    if (!hasValidImageSignature(signature, token.mimeType)) {
      await deleteUploadedObject(token.key);
      return badRequest("R2 nesnesinin içeriği bildirilen görsel türüyle eşleşmedi.");
    }
    let imageId: string;
    try {
      imageId = await attachUploadedImage({
        projectId: id.data, key: token.key, url: publicObjectUrl(token.key), mimeType: token.mimeType, size,
        width: input.data.width, height: input.data.height, altText: input.data.altText, caption: input.data.caption, type: input.data.type,
      });
    } catch (databaseError) {
      await deleteUploadedObject(token.key).catch(() => console.error("[projects:r2-cleanup] cleanup failed"));
      throw databaseError;
    }
    const project = await getAdminProject(id.data);
    refreshProjectPages(project?.slug);
    return Response.json({ imageId }, { status: 201 });
  } catch (error) {
    return serverError(error, "finalize");
  }
}
