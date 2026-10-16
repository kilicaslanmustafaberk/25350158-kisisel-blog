import { postIdSchema, postInputSchema } from "@/features/blog/validation";
import { badRequest, readJson, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { deletePost, getAdminPost, resolveNewTagIds, slugExists, updatePost, validateCategoryId, validateTagIds } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = postIdSchema.safeParse((await context.params).id);
  const inputResult = postInputSchema.safeParse(await readJson(request));
  if (!idResult.success || !inputResult.success) return badRequest(undefined, inputResult.error?.flatten().fieldErrors);

  try {
    const current = await getAdminPost(idResult.data);
    if (!current) return Response.json({ error: "Yazı bulunamadı." }, { status: 404 });
    if (await slugExists(inputResult.data.slug, idResult.data)) return badRequest("Bu slug başka bir yazıda kullanılıyor.");
    if (!(await validateCategoryId(inputResult.data.categoryId))) return badRequest("Seçilen kategori artık mevcut değil.");
    if (!(await validateTagIds(inputResult.data.tagIds))) return badRequest("Seçilen etiketlerden biri artık mevcut değil.");
    const newTagIds = await resolveNewTagIds(inputResult.data.newTagNames);
    await updatePost(idResult.data, inputResult.data, [...inputResult.data.tagIds, ...newTagIds]);
    refreshBlogPages(inputResult.data.slug, current.slug);
    return Response.json({ id: idResult.data });
  } catch (error) {
    return serverError(error, "update");
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = postIdSchema.safeParse((await context.params).id);
  if (!idResult.success) return badRequest();
  try {
    const deleted = await deletePost(idResult.data);
    if (!deleted) return Response.json({ error: "Yazı bulunamadı." }, { status: 404 });
    refreshBlogPages(deleted.slug);
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "delete");
  }
}
