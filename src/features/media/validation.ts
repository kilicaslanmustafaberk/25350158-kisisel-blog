import { z } from "zod";

export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxImageBytes = 5 * 1024 * 1024;

export const storedImageKeySchema = z.string().regex(
  /^(?:projects|blog)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/,
);

export const uploadRequestSchema = z.object({
  mimeType: z.enum(allowedImageTypes),
  size: z.number().int().positive().max(maxImageBytes),
});

export const imageExtensionByMimeType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export function hasValidImageSignature(bytes: Uint8Array, mimeType: (typeof allowedImageTypes)[number]) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= png.length && png.every((value, index) => bytes[index] === value);
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
}
