import { projectIdSchema, projectInputSchema } from "@/features/projects/validation";
import { badRequest, readJson, refreshProjectPages, serverError, unauthorized } from "@/server/projects/http";
import { deleteProject, getAdminProject, slugExists, updateProject, validateSkillIds } from "@/server/projects/repository";
import { requireAdminApi } from "@/server/require-admin";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = projectIdSchema.safeParse((await context.params).id);
  const inputResult = projectInputSchema.safeParse(await readJson(request));
  if (!idResult.success || !inputResult.success) return badRequest(undefined, inputResult.error?.flatten().fieldErrors);

  try {
    const current = await getAdminProject(idResult.data);
    if (!current) return Response.json({ error: "Proje bulunamadı." }, { status: 404 });
    if (await slugExists(inputResult.data.slug, idResult.data)) return badRequest("Bu slug başka bir projede kullanılıyor.");
    if (!(await validateSkillIds(inputResult.data.skillIds))) return badRequest("Seçilen yeteneklerden biri artık mevcut değil.");
    await updateProject(idResult.data, inputResult.data);
    refreshProjectPages(current.slug);
    if (current.slug !== inputResult.data.slug) refreshProjectPages(inputResult.data.slug);
    return Response.json({ id: idResult.data });
  } catch (error) {
    return serverError(error, "update");
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = projectIdSchema.safeParse((await context.params).id);
  if (!idResult.success) return badRequest();
  try {
    const deleted = await deleteProject(idResult.data);
    if (!deleted) return Response.json({ error: "Proje bulunamadı." }, { status: 404 });
    refreshProjectPages(deleted.slug);
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "delete");
  }
}
