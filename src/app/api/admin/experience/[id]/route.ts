import { experienceInputSchema, idSchema } from "@/features/cv/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { deleteExperience, updateExperience } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = idSchema.safeParse((await context.params).id);
  const inputResult = experienceInputSchema.safeParse(await readJson(request));
  if (!idResult.success || !inputResult.success) return badRequest(undefined, inputResult.error?.flatten().fieldErrors);
  try {
    const updated = await updateExperience(idResult.data, inputResult.data);
    if (!updated) return Response.json({ error: "Deneyim kaydı bulunamadı." }, { status: 404 });
    refreshCvPages();
    return Response.json({ id: idResult.data });
  } catch (error) {
    return serverError(error, "experience-update");
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = idSchema.safeParse((await context.params).id);
  if (!idResult.success) return badRequest();
  try {
    const deleted = await deleteExperience(idResult.data);
    if (!deleted) return Response.json({ error: "Deneyim kaydı bulunamadı." }, { status: 404 });
    refreshCvPages();
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "experience-delete");
  }
}
