import { socialLinkInputSchema } from "@/features/social/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { createSocialLink } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const result = socialLinkInputSchema.safeParse(await readJson(request));
  if (!result.success) return badRequest(undefined, result.error.flatten().fieldErrors);
  try {
    const id = await createSocialLink(result.data);
    if (!id) return badRequest("Sosyal bağlantı eklemeden önce profil bilgilerini kaydedin.");
    refreshCvPages();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "social-create");
  }
}
