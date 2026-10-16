import { postInputSchema } from "@/features/blog/validation";
import { badRequest, readJson, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { createPost, resolveNewTagIds, slugExists, validateCategoryId, validateTagIds } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = postInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);

  try {
    if (await slugExists(result.data.slug)) return badRequest("Bu slug başka bir yazıda kullanılıyor.");
    if (!(await validateCategoryId(result.data.categoryId))) return badRequest("Seçilen kategori artık mevcut değil.");
    if (!(await validateTagIds(result.data.tagIds))) return badRequest("Seçilen etiketlerden biri artık mevcut değil.");
    const newTagIds = await resolveNewTagIds(result.data.newTagNames);
    const id = await createPost(result.data, [...result.data.tagIds, ...newTagIds]);
    refreshBlogPages(result.data.slug);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "create");
  }
}
