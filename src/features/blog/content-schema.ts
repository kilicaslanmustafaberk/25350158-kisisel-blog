import { z } from "zod";

/**
 * Allowlist-based validator/normalizer for Tiptap ProseMirror JSON documents.
 *
 * The public blog renderer never uses `dangerouslySetInnerHTML`; it walks this
 * normalized structure and maps each node/mark to a fixed React element. Any
 * node type, mark type, or link protocol that is not explicitly allowed here
 * is rejected before the document reaches the database, so arbitrary HTML can
 * never be stored or rendered — see docs/SECURITY.md and docs/DECISIONS.md.
 */

export type TiptapLinkMark = {
  type: "link";
  attrs: { href: string; target: "_blank" | null; rel: string | null };
};
export type TiptapSimpleMark = { type: "bold" | "italic" | "strike" | "code" };
export type TiptapMark = TiptapLinkMark | TiptapSimpleMark;

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
};

export class PostContentError extends Error {}

const allowedMarkTypes = ["bold", "italic", "strike", "code", "link"] as const;
const allowedLinkProtocols = new Set(["http:", "https:", "mailto:"]);
const MAX_TEXT_LENGTH = 20_000;
const MAX_NODES = 3_000;
const MAX_DEPTH = 40;

export const MAX_CONTENT_JSON_LENGTH = 200_000;

function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length === 0 || href.length > 2_000) return false;
  try {
    return allowedLinkProtocols.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

function normalizeMark(mark: unknown): TiptapMark {
  if (!mark || typeof mark !== "object" || !("type" in mark)) {
    throw new PostContentError("Geçersiz mark yapısı.");
  }
  const type = (mark as { type: unknown }).type;
  if (typeof type !== "string" || !(allowedMarkTypes as readonly string[]).includes(type)) {
    throw new PostContentError(`Desteklenmeyen mark türü: ${String(type)}`);
  }
  if (type === "link") {
    const attrs = ((mark as { attrs?: Record<string, unknown> }).attrs ?? {}) as { href?: unknown };
    if (!isSafeHref(attrs.href)) {
      throw new PostContentError("Link yalnızca http, https veya mailto protokolüyle kabul edilir.");
    }
    const isExternal = !attrs.href.startsWith("mailto:");
    return {
      type: "link",
      attrs: { href: attrs.href, target: isExternal ? "_blank" : null, rel: isExternal ? "noopener noreferrer nofollow" : null },
    };
  }
  return { type } as TiptapSimpleMark;
}

type Counter = { nodes: number };

function normalizeChildren(content: unknown, depth: number, counter: Counter): TiptapNode[] {
  if (content === undefined) return [];
  if (!Array.isArray(content)) throw new PostContentError("Geçersiz içerik listesi.");
  return content.map((child) => normalizeNode(child, depth + 1, counter));
}

function normalizeNode(node: unknown, depth: number, counter: Counter): TiptapNode {
  counter.nodes += 1;
  if (counter.nodes > MAX_NODES) throw new PostContentError("İçerik izin verilen düğüm sayısını aşıyor.");
  if (depth > MAX_DEPTH) throw new PostContentError("İçerik iç içe geçme sınırını aşıyor.");
  if (!node || typeof node !== "object" || !("type" in node)) throw new PostContentError("Geçersiz içerik düğümü.");

  const raw = node as { type: unknown; attrs?: unknown; content?: unknown; text?: unknown; marks?: unknown };
  const type = raw.type;
  if (typeof type !== "string") throw new PostContentError("Düğüm türü eksik.");

  switch (type) {
    case "text": {
      if (typeof raw.text !== "string" || raw.text.length === 0 || raw.text.length > MAX_TEXT_LENGTH) {
        throw new PostContentError("Geçersiz metin düğümü.");
      }
      const marks = Array.isArray(raw.marks) ? raw.marks.map(normalizeMark) : undefined;
      return { type: "text", text: raw.text, ...(marks && marks.length ? { marks } : {}) };
    }
    case "hardBreak":
    case "horizontalRule":
      return { type };
    case "heading": {
      const attrs = (raw.attrs ?? {}) as { level?: unknown };
      const level = attrs.level === 3 ? 3 : 2;
      const content = normalizeChildren(raw.content, depth, counter);
      return { type: "heading", attrs: { level }, content };
    }
    case "codeBlock": {
      const attrs = (raw.attrs ?? {}) as { language?: unknown };
      const language = typeof attrs.language === "string" && attrs.language.length <= 40 ? attrs.language : null;
      const content = normalizeChildren(raw.content, depth, counter).map((child) => {
        if (child.type !== "text") throw new PostContentError("Kod bloğu yalnızca düz metin içerebilir.");
        return { type: "text", text: child.text as string };
      });
      return { type: "codeBlock", attrs: { language }, content };
    }
    case "paragraph":
    case "blockquote":
    case "bulletList":
    case "orderedList":
    case "listItem":
      return { type, content: normalizeChildren(raw.content, depth, counter) };
    default:
      throw new PostContentError(`Desteklenmeyen içerik türü: ${type}`);
  }
}

export function normalizeTiptapDocument(input: unknown): TiptapNode {
  if (!input || typeof input !== "object" || (input as { type?: unknown }).type !== "doc") {
    throw new PostContentError("İçerik kök düğümü 'doc' olmalıdır.");
  }
  const counter: Counter = { nodes: 0 };
  const content = normalizeChildren((input as { content?: unknown }).content, 0, counter);
  if (!content.length) throw new PostContentError("İçerik boş olamaz.");
  return { type: "doc", content };
}

export const postContentSchema = z
  .unknown()
  .refine((value) => {
    try {
      normalizeTiptapDocument(value);
      return true;
    } catch {
      return false;
    }
  }, "İçerik desteklenmeyen bir düğüm, mark veya link protokolü içeriyor.")
  .transform((value) => normalizeTiptapDocument(value));
