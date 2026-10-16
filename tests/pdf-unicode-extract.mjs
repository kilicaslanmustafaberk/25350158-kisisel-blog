import { inflateSync } from "node:zlib";

// Test-only reader for react-pdf Type0 fonts; deliberately not a general parser.
function parse(buffer) {
  const objects = new Map(), fonts = new Map(), maps = new Map();
  const source = buffer.toString("latin1");
  for (const m of source.matchAll(/(\d+) \d+ obj\b([\s\S]*?)endobj/g)) objects.set(m[1], m[2]);
  const stream = (body = "") => {
    const m = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(body);
    if (!m) return "";
    try { return /\/FlateDecode/.test(body) ? inflateSync(Buffer.from(m[1], "latin1")).toString("latin1") : m[1]; } catch { return ""; }
  };
  const decode = (hex) => [...hex.replace(/\s+/g, "").matchAll(/.{4}/g)].map(([part]) => String.fromCharCode(parseInt(part, 16))).join("");
  for (const [id, body] of objects) {
    const ref = /\/ToUnicode (\d+) \d+ R/.exec(body)?.[1];
    if (!ref) continue;
    const cmap = stream(objects.get(ref)), map = new Map();
    for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const p of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f\s]+)>/gi)) map.set(parseInt(p[1], 16), decode(p[2]));
    for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const r of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>\s*(<([\da-f]+)>|\[([^\]]+)\])/gi)) {
      const start = parseInt(r[1], 16), end = parseInt(r[2], 16);
      const values = r[5] ? [...r[5].matchAll(/<([\da-f\s]+)>/gi)].map((v) => decode(v[1])) : null;
      for (let code = start; code <= end; code++) map.set(code, values ? values[code - start] : String.fromCharCode(parseInt(r[4], 16) + code - start));
    }
    maps.set(id, map);
  }
  for (const m of source.matchAll(/\/(F\d+) (\d+) \d+ R/g)) fonts.set(m[1], maps.get(m[2]));
  const contentText = (content) => {
    let result = "", font;
    for (const t of content.matchAll(/\/(F\d+)\s+[\d.]+\s+Tf|<([\da-f]+)>|\bET\b/gi)) {
      if (t[1]) font = fonts.get(t[1]);
      else if (t[2]) for (let i = 0; i < t[2].length; i += font ? 4 : 2) { const code = parseInt(t[2].slice(i, i + (font ? 4 : 2)), 16); result += font?.get(code) ?? String.fromCharCode(code); }
      else result += "\n";
    }
    return result;
  };
  return { objects, stream, contentText };
}

export function extractUnicodePdfText(buffer) {
  const { objects, stream, contentText } = parse(buffer);
  let result = "";
  for (const body of objects.values()) {
    const content = stream(body);
    if (/\bBT\b/.test(content)) result += contentText(content);
  }
  return result;
}

/** Text of each page in document order (page tree `/Kids` order), for pagination tests. */
export function extractUnicodePdfPages(buffer) {
  const { objects, stream, contentText } = parse(buffer);
  const root = [...objects.values()].find((body) => /\/Type \/Pages\b/.test(body) && !/\/Parent\b/.test(body));
  const kids = [...(/\/Kids \[([^\]]*)\]/.exec(root ?? "")?.[1] ?? "").matchAll(/(\d+) \d+ R/g)].map((m) => m[1]);
  return kids.map((id) => {
    const refs = /\/Contents\s*(?:\[([^\]]*)\]|(\d+) \d+ R)/.exec(objects.get(id) ?? "");
    const contentIds = refs?.[2] ? [refs[2]] : [...(refs?.[1] ?? "").matchAll(/(\d+) \d+ R/g)].map((m) => m[1]);
    return contentIds.map((contentId) => contentText(stream(objects.get(contentId)))).join("");
  });
}
