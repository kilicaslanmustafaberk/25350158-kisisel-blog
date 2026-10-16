import { cvSettingsInputSchema } from "@/features/cv/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { upsertCvSettings } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function PUT(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = cvSettingsInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    await upsertCvSettings(result.data);
    refreshCvPages();
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error, "settings-update");
  }
}
