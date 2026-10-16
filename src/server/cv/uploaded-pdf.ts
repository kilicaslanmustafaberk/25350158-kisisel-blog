import "server-only";

import { eq } from "drizzle-orm";

import { cvSettings } from "@/db/schema";
import { cvPdfKeySchema } from "@/features/cv/uploaded-pdf";

async function database() {
  return (await import("@/db")).db;
}

const PRIMARY_ID = "primary";

export type UploadedCv = {
  key: string;
  originalName: string;
  size: number;
  uploadedAt: Date | null;
};

/** The active professional CV, or null when the generated PDF should be served. */
export async function getActiveUploadedCv(): Promise<UploadedCv | null> {
  const db = await database();
  const rows = await db
    .select({
      key: cvSettings.uploadedPdfKey,
      originalName: cvSettings.uploadedPdfOriginalName,
      size: cvSettings.uploadedPdfSize,
      uploadedAt: cvSettings.uploadedPdfUploadedAt,
    })
    .from(cvSettings)
    .where(eq(cvSettings.id, PRIMARY_ID))
    .limit(1);
  const row = rows[0];
  // Only a well-formed `cv/<uuid>.pdf` key is ever treated as active.
  if (!row?.key || !cvPdfKeySchema.safeParse(row.key).success) return null;
  return { key: row.key, originalName: row.originalName ?? "cv.pdf", size: row.size ?? 0, uploadedAt: row.uploadedAt ?? null };
}

/**
 * Admin view: distinguishes "no upload" from "database not migrated yet", so the CV
 * page can explain the missing migration instead of failing.
 */
export async function getUploadedCvAdminState(): Promise<{ schemaReady: boolean; active: UploadedCv | null }> {
  try {
    return { schemaReady: true, active: await getActiveUploadedCv() };
  } catch (error) {
    console.error("[cv:pdf] uploaded CV metadata unavailable (migration pending?)", { errorType: error instanceof Error ? error.name : typeof error });
    return { schemaReady: false, active: null };
  }
}

/**
 * Atomically switches the active CV to a verified object and returns the previous key
 * (for best-effort cleanup after the switch has committed).
 */
export async function activateUploadedCv(input: { key: string; originalName: string; size: number }) {
  const db = await database();
  return db.transaction(async (tx) => {
    const previous = await tx.select({ key: cvSettings.uploadedPdfKey }).from(cvSettings).where(eq(cvSettings.id, PRIMARY_ID)).limit(1);
    const values = {
      uploadedPdfKey: input.key,
      uploadedPdfOriginalName: input.originalName,
      uploadedPdfSize: input.size,
      uploadedPdfUploadedAt: new Date(),
    };
    await tx.insert(cvSettings).values({ id: PRIMARY_ID, ...values }).onConflictDoUpdate({ target: cvSettings.id, set: values });
    const previousKey = previous[0]?.key ?? null;
    return previousKey && previousKey !== input.key ? previousKey : null;
  });
}

/** Clears the active upload (public endpoint falls back to the generated PDF) and returns the removed key. */
export async function clearUploadedCv() {
  const db = await database();
  return db.transaction(async (tx) => {
    const previous = await tx.select({ key: cvSettings.uploadedPdfKey }).from(cvSettings).where(eq(cvSettings.id, PRIMARY_ID)).limit(1);
    await tx
      .update(cvSettings)
      .set({ uploadedPdfKey: null, uploadedPdfOriginalName: null, uploadedPdfSize: null, uploadedPdfUploadedAt: null })
      .where(eq(cvSettings.id, PRIMARY_ID));
    return previous[0]?.key ?? null;
  });
}
