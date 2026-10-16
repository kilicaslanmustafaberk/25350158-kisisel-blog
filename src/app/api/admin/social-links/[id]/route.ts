import { idSchema } from "@/features/cv/validation";
import { socialLinkInputSchema } from "@/features/social/validation";
import { badRequest, readJson, refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { deleteSocialLink, updateSocialLink } from "@/server/cv/repository";
import { requireAdminApi } from "@/server/require-admin";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = idSchema.safeParse((await context.params).id);
  const inputResult = socialLinkInputSchema.safeParse(await readJson(request));
  if (!idResult.success || !inputResult.success) return badRequest(undefined, inputResult.error?.flatten().fieldErrors);
  try {
    const updated = await updateSocialLink(idResult.data, inputResult.data);
    if (!updated) return Response.json({ error: "Sosyal bağlantı bulunamadı." }, { status: 404 });
    refreshCvPages();
    return Response.json({ id: idResult.data });
  } catch (error) {
    return serverError(error, "social-update");
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireAdminApi(request))) return unauthorized();
  const idResult = idSchema.safeParse((await context.params).id);
  if (!idResult.success) return badRequest();
  try {
    const deleted = await deleteSocialLink(idResult.data);
    if (!deleted) return Response.json({ error: "Sosyal bağlantı bulunamadı." }, { status: 404 });
    refreshCvPages();
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, "social-delete");
  }
}
