import { certificateInputSchema } from "@/features/certificates/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { createCertificate } from "@/server/certificates/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = certificateInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    const id = await createCertificate(result.data);
    refreshCvPages();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "certificate-create");
  }
}
