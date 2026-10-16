import { refreshCvPages, serverError, unauthorized } from "@/server/cv/http";
import { clearUploadedCv } from "@/server/cv/uploaded-pdf";
import { requireAdminApi } from "@/server/require-admin";
import { deleteUploadedObject } from "@/server/storage/r2";
import { isR2Configured } from "@/server/storage/r2-env";

/** Removes the professional CV; the public endpoint falls back to the generated PDF. */
export async function DELETE(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  try {
    const removedKey = await clearUploadedCv();
    if (removedKey && isR2Configured()) {
      await deleteUploadedObject(removedKey).catch(() => console.error("[cv:pdf-cleanup] removed CV cleanup failed"));
    }
    refreshCvPages();
    return Response.json({ ok: true, removed: Boolean(removedKey) });
  } catch (error) {
    return serverError(error, "pdf-remove");
  }
}
