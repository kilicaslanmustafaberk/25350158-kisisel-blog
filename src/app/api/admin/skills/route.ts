import { skillInputSchema } from "@/features/cv/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { createSkill, skillSlugExists } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = skillInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    if (await skillSlugExists(result.data.slug)) return badRequest("Bu slug başka bir yetenekte kullanılıyor.");
    const id = await createSkill(result.data);
    refreshCvPages();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "skill-create");
  }
}
