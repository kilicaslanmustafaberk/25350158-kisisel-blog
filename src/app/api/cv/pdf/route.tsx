import { renderToBuffer } from "@react-pdf/renderer";

import { cvContentDisposition, cvDownloadFileName, cvPdfMimeType, hasPdfSignature, maxCvPdfBytes } from "@/features/cv/uploaded-pdf";
import { CvPdfDocument } from "@/server/cv/pdf-document";
import { getProfile, getPublicCvData, type PublicCvData } from "@/server/cv/repository";
import { getActiveUploadedCv } from "@/server/cv/uploaded-pdf";
import { readUploadedObject } from "@/server/storage/r2";
import { isR2Configured } from "@/server/storage/r2-env";

// @react-pdf/renderer relies on Node.js APIs (buffers/streams) and is not Edge-compatible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderCvPdf(data: PublicCvData) {
  return renderToBuffer(<CvPdfDocument data={data} />);
}

function pdfResponse(bytes: Uint8Array, fileName: string, download: boolean, source: "uploaded" | "generated") {
  return new Response(Uint8Array.from(bytes).buffer, {
    status: 200,
    headers: {
      "Content-Type": cvPdfMimeType,
      "Content-Disposition": cvContentDisposition(download ? "attachment" : "inline", fileName),
      "Content-Length": String(bytes.byteLength),
      // Replacing the CV must take effect immediately; never cache a stale version.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-CV-Source": source,
    },
  });
}

/**
 * The admin-uploaded professional CV, read server-side from R2 and delivered same-origin
 * (no public r2.dev dependency, no signed URL exposed). Any storage problem degrades to
 * the generated PDF instead of breaking the public CV link.
 */
async function readUploadedCv() {
  try {
    const active = await getActiveUploadedCv();
    if (!active || !isR2Configured()) return null;
    const object = await readUploadedObject(active.key);
    const contentType = object.contentType?.toLowerCase().split(";")[0]?.trim();
    if (contentType !== cvPdfMimeType || object.bytes.byteLength > maxCvPdfBytes || !hasPdfSignature(object.bytes)) {
      console.error("[cv:pdf] active uploaded CV failed verification; serving generated fallback");
      return null;
    }
    return object.bytes;
  } catch (error) {
    console.error("[cv:pdf] uploaded CV unavailable; serving generated fallback", { errorType: error instanceof Error ? error.name : typeof error });
    return null;
  }
}

export async function GET(request: Request) {
  // Only `download` is read from the query; no key, URL or path is ever taken from the request.
  const download = new URL(request.url).searchParams.get("download") === "1";
  try {
    const uploaded = await readUploadedCv();
    if (uploaded) {
      const profile = await getProfile().catch(() => null);
      return pdfResponse(uploaded, cvDownloadFileName(profile?.fullName), download, "uploaded");
    }

    const data = await getPublicCvData();
    if (!data) {
      return Response.json({ error: "CV içeriği henüz yayınlanmadı." }, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const buffer = await renderCvPdf(data);
    return pdfResponse(new Uint8Array(buffer), cvDownloadFileName(data.profile.fullName), download, "generated");
  } catch (error) {
    console.error("[cv:pdf]", { errorType: error instanceof Error ? error.name : typeof error });
    return Response.json({ error: "PDF şu anda oluşturulamıyor. Lütfen tekrar deneyin." }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
