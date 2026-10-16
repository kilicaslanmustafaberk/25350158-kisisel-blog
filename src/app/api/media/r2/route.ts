import { allowedImageTypes } from "@/features/media/validation";
import { r2ObjectKeyFromPublicUrl } from "@/features/media/delivery-url";
import { readUploadedObject } from "@/server/storage/r2";
import { getR2Environment, isR2Configured } from "@/server/storage/r2-env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  if (!isR2Configured()) return new Response(null, { status: 503 });

  const source = new URL(request.url).searchParams.get("url");
  const environment = getR2Environment();
  const key = source ? r2ObjectKeyFromPublicUrl(source, environment.publicBaseUrl) : null;
  if (!key) return Response.json({ error: "Geçersiz medya adresi." }, { status: 400 });

  try {
    const object = await readUploadedObject(key);
    if (!object.contentType || !allowedImageTypes.includes(object.contentType as (typeof allowedImageTypes)[number])) {
      return new Response(null, { status: 415 });
    }

    const headers = new Headers({
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "Content-Length": String(object.bytes.byteLength),
      "Content-Type": object.contentType,
      "X-Content-Type-Options": "nosniff",
    });
    if (object.etag) headers.set("ETag", object.etag);
    return new Response(Uint8Array.from(object.bytes).buffer, { headers });
  } catch (error) {
    const status = typeof error === "object" && error && "$metadata" in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
    return new Response(null, { status: status === 404 ? 404 : 502 });
  }
}
