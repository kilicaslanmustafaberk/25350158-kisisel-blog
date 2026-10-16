import { categoryInputSchema } from "@/features/blog/validation";
import { badRequest, readJson, refreshBlogPages, serverError, unauthorized } from "@/server/blog/http";
import { categorySlugExists, createCategory } from "@/server/blog/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = categoryInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    if (await categorySlugExists(result.data.slug)) return badRequest("Bu slug başka bir kategoride kullanılıyor.");
    const id = await createCategory(result.data);
    refreshBlogPages();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "category-create");
  }
}
