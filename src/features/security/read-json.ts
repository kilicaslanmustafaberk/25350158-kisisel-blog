// Upper bound for admin JSON bodies. The largest legitimate payload is a blog
// post whose Tiptap JSON is capped at 200 000 characters, so 1 MiB leaves room
// for multi-byte UTF-8 and the remaining fields while refusing oversized bodies
// before they are buffered in full.
export const MAX_JSON_BODY_BYTES = 1024 * 1024;

export async function readJsonWithLimit(request: Request, maxBytes = MAX_JSON_BODY_BYTES): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
