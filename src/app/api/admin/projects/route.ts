import { projectInputSchema } from "@/features/projects/validation";
import { requireAdminApi } from "@/server/require-admin";
import { createProject, slugExists, validateSkillIds } from "@/server/projects/repository";
import { badRequest, readJson, refreshProjectPages, serverError, unauthorized } from "@/server/projects/http";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = projectInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);

  try {
    if (await slugExists(result.data.slug)) return badRequest("Bu slug başka bir projede kullanılıyor.");
    if (!(await validateSkillIds(result.data.skillIds))) return badRequest("Seçilen yeteneklerden biri artık mevcut değil.");
    const id = await createProject(result.data);
    refreshProjectPages(result.data.slug);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "create");
  }
}
