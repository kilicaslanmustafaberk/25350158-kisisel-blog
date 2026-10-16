import { experienceInputSchema } from "@/features/cv/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { createExperience } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = experienceInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    const id = await createExperience(result.data);
    refreshCvPages();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "experience-create");
  }
}
