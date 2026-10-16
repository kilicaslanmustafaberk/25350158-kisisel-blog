import { hasValidImageSignature, maxImageBytes } from "@/features/media/validation";
import { coverFinalizeSchema, postIdSchema } from "@/features/blog/validation";
import { badRequest, readJson, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { attachPostCover, getAdminPost, postExists } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";
import { deleteUploadedObject, headUploadedObject, publicObjectUrl, readUploadedObjectSignature } from "@/server/storage/r2";
import { verifyUploadToken } from "@/server/storage/upload-token";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = postIdSchema.safeParse((await params).id);
  const input = coverFinalizeSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest(undefined, input.error?.flatten().fieldErrors);
  const token = verifyUploadToken(input.data.uploadToken, "blog", id.data);
  if (!token) return badRequest("Upload bileti geçersiz veya süresi dolmuş.");

  try {
    if (!(await postExists(id.data))) return Response.json({ error: "Yazı bulunamadı." }, { status: 404 });
    const head = await headUploadedObject(token.key);
    const size = head.ContentLength ?? 0;
    const contentType = head.ContentType?.toLowerCase();
    if (contentType !== token.mimeType || size <= 0 || size > maxImageBytes || size !== token.expectedSize) {
      await deleteUploadedObject(token.key);
      return badRequest("R2 nesnesinin MIME türü veya boyutu beklenen değerle eşleşmedi.");
    }
    const signature = await readUploadedObjectSignature(token.key);
    if (!hasValidImageSignature(signature, token.mimeType)) {
      await deleteUploadedObject(token.key);
      return badRequest("R2 nesnesinin içeriği bildirilen görsel türüyle eşleşmedi.");
    }
    let mediaId: string;
    try {
      mediaId = await attachPostCover({
        postId: id.data,
        key: token.key,
        url: publicObjectUrl(token.key),
        mimeType: token.mimeType,
        size,
        width: input.data.width,
        height: input.data.height,
        altText: input.data.altText,
      });
    } catch (databaseError) {
      await deleteUploadedObject(token.key).catch(() => console.error("[blog:r2-cleanup] cleanup failed"));
      throw databaseError;
    }
    const post = await getAdminPost(id.data);
    refreshBlogPages(post?.slug);
    return Response.json({ mediaId }, { status: 201 });
  } catch (error) {
    return serverError(error, "finalize");
  }
}
