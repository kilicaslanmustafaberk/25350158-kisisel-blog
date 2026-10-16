import { imageIdSchema, imageMoveSchema, projectIdSchema } from "@/features/projects/validation";
import { badRequest, readJson, refreshProjectPages, serverError, unauthorized } from "@/server/projects/http";
import { getAdminProject, moveProjectImage, removeProjectImage } from "@/server/projects/repository";
import { requireAdminApi } from "@/server/require-admin";

type Context = { params: Promise<{ id: string; imageId: string }> };

async function ids(context: Context) {
  const params = await context.params;
  return { projectId: projectIdSchema.safeParse(params.id), imageId: imageIdSchema.safeParse(params.imageId) };
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const parsed = await ids(context);
  if (!parsed.projectId.success || !parsed.imageId.success) return badRequest();
  try {
    const removed = await removeProjectImage(parsed.projectId.data, parsed.imageId.data);
    if (!removed) return Response.json({ error: "Görsel ilişkisi bulunamadı." }, { status: 404 });
    const project = await getAdminProject(parsed.projectId.data);
    refreshProjectPages(project?.slug);
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "image-remove");
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const parsed = await ids(context);
  const input = imageMoveSchema.safeParse(await readJson(request));
  if (!parsed.projectId.success || !parsed.imageId.success || !input.success) return badRequest();
  try {
    const moved = await moveProjectImage(parsed.projectId.data, parsed.imageId.data, input.data.direction);
    if (!moved) return Response.json({ error: "Galeri görseli bulunamadı." }, { status: 404 });
    const project = await getAdminProject(parsed.projectId.data);
    refreshProjectPages(project?.slug);
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error, "image-move");
  }
}
