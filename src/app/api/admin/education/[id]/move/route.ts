import { idSchema, moveDirectionSchema } from "@/features/cv/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { moveEducation } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const input = moveDirectionSchema.safeParse(await readJson(request));
  if (!id.success || !input.success) return badRequest();
  try {
    const moved = await moveEducation(id.data, input.data.direction);
    if (!moved) return Response.json({ error: "Eğitim kaydı bulunamadı." }, { status: 404 });
    refreshCvPages();
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error, "education-move");
  }
}
