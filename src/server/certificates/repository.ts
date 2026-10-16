import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { certificates } from "@/db/schema";
import { buildPublicCertificates, type PublicCertificate } from "@/features/certificates/display";
import type { CertificateInput } from "@/features/certificates/validation";

async function database() {
  return (await import("@/db")).db;
}

const publicColumns = {
  id: certificates.id,
  title: certificates.title,
  issuer: certificates.issuer,
  instructor: certificates.instructor,
  issuedAt: certificates.issuedAt,
  expiresAt: certificates.expiresAt,
  credentialId: certificates.credentialId,
  credentialUrl: certificates.credentialUrl,
  description: certificates.description,
  displayOrder: certificates.displayOrder,
};

// ---------- Public reads: visibility is filtered in SQL, never in the client ----------

/** Landing page: `is_visible = 1` only. */
export async function listPublicCertificates(limit?: number): Promise<PublicCertificate[]> {
  const db = await database();
  const rows = await db.select(publicColumns).from(certificates).where(eq(certificates.isVisible, true));
  return buildPublicCertificates(rows, limit);
}

/** Web CV / PDF: `is_visible = 1 AND show_in_cv = 1`. */
export async function listCvCertificates(): Promise<PublicCertificate[]> {
  const db = await database();
  const rows = await db.select(publicColumns).from(certificates).where(and(eq(certificates.isVisible, true), eq(certificates.showInCv, true)));
  return buildPublicCertificates(rows);
}

// ---------- Admin CMS ----------

export async function listCertificatesAdmin() {
  const db = await database();
  return db
    .select({ ...publicColumns, isVisible: certificates.isVisible, showInCv: certificates.showInCv })
    .from(certificates)
    .orderBy(asc(certificates.displayOrder), asc(certificates.createdAt));
}

function values(input: CertificateInput) {
  return {
    title: input.title,
    issuer: input.issuer,
    instructor: input.instructor,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    credentialId: input.credentialId,
    credentialUrl: input.credentialUrl,
    description: input.description,
    isVisible: input.isVisible,
    showInCv: input.showInCv,
  };
}

export async function createCertificate(input: CertificateInput) {
  const db = await database();
  const id = crypto.randomUUID();
  const [{ nextOrder }] = await db.select({ nextOrder: sql<number>`coalesce(max(${certificates.displayOrder}), -1) + 1` }).from(certificates);
  await db.insert(certificates).values({ id, ...values(input), displayOrder: Number(nextOrder), createdAt: new Date(), updatedAt: new Date() });
  return id;
}

export async function updateCertificate(id: string, input: CertificateInput) {
  const db = await database();
  const updated = await db.update(certificates).set({ ...values(input), updatedAt: new Date() }).where(eq(certificates.id, id)).returning({ id: certificates.id });
  return updated.length > 0;
}

export async function deleteCertificate(id: string) {
  const db = await database();
  const deleted = await db.delete(certificates).where(eq(certificates.id, id)).returning({ id: certificates.id });
  return deleted.length > 0;
}

export async function moveCertificate(id: string, direction: "up" | "down") {
  const db = await database();
  return db.transaction(async (tx) => {
    const ordered = await tx.select({ id: certificates.id }).from(certificates).orderBy(asc(certificates.displayOrder), asc(certificates.createdAt));
    const index = ordered.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return true;
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    for (const [displayOrder, item] of ordered.entries()) {
      await tx.update(certificates).set({ displayOrder }).where(eq(certificates.id, item.id));
    }
    return true;
  });
}
