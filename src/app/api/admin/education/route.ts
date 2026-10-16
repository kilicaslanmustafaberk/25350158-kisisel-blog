import { educationInputSchema } from "@/features/cv/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { createEducation } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = educationInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    const id = await createEducation(result.data);
    refreshCvPages();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "education-create");
  }
}
