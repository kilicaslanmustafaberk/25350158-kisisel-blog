import { projectIdSchema, projectStateSchema } from "@/features/projects/validation";
import { badRequest, readJson, refreshProjectPages, serverError, unauthorized } from "@/server/projects/http";
import { updateProjectState } from "@/server/projects/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = projectIdSchema.safeParse((await params).id);
  const input = projectStateSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest();
  try {
    const project = await updateProjectState(id.data, input.data.field, input.data.value);
    if (!project) return Response.json({ error: "Proje bulunamadı." }, { status: 404 });
    refreshProjectPages(project.slug);
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error, "state");
  }
}
