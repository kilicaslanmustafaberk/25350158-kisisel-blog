import { categoryIdSchema, categoryInputSchema } from "@/features/blog/validation";
import { badRequest, readJson, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { categorySlugExists, deleteCategory, updateCategory } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = categoryIdSchema.safeParse((await context.params).id);
  const inputResult = categoryInputSchema.safeParse(await readJson(request));
  if (!idResult.success || !inputResult.success) return badRequest(undefined, inputResult.error?.flatten().fieldErrors);
  try {
    if (await categorySlugExists(inputResult.data.slug, idResult.data)) return badRequest("Bu slug başka bir kategoride kullanılıyor.");
    const updated = await updateCategory(idResult.data, inputResult.data);
    if (!updated) return Response.json({ error: "Kategori bulunamadı." }, { status: 404 });
    refreshBlogPages();
    return Response.json({ id: idResult.data });
  } catch (error) {
    return serverError(error, "category-update");
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = categoryIdSchema.safeParse((await context.params).id);
  if (!idResult.success) return badRequest();
  try {
    const deleted = await deleteCategory(idResult.data);
    if (!deleted) return Response.json({ error: "Kategori bulunamadı." }, { status: 404 });
    refreshBlogPages();
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "category-delete");
  }
}
