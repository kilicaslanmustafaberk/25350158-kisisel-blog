import { postIdSchema, postStateSchema } from "@/features/blog/validation";
import { badRequest, readJson, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { updatePostStatus } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = postIdSchema.safeParse((await params).id);
  const input = postStateSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest();
  try {
    const post = await updatePostStatus(id.data, input.data.status);
    if (!post) return Response.json({ error: "Yazı bulunamadı." }, { status: 404 });
    refreshBlogPages(post.slug);
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error, "state");
  }
}
