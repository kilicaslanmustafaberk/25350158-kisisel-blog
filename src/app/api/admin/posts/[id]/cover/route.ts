import { postIdSchema } from "@/features/blog/validation";
import { badRequest, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { getAdminPost, removePostCover } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = postIdSchema.safeParse((await params).id);
  if (!id.success) return badRequest();
  try {
    const post = await getAdminPost(id.data);
    if (!post) return Response.json({ error: "Yazı bulunamadı." }, { status: 404 });
    await removePostCover(id.data);
    refreshBlogPages(post.slug);
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "cover-remove");
  }
}
