import { inflateSync } from "node:zlib";
import { extractUnicodePdfText } from "./pdf-unicode-extract.mjs";

/**
 * Minimal, dependency-free PDF text extractor used only for Phase 4 tests.
 * It is not a full PDF parser: it locates FlateDecode content streams,
 * inflates them with Node's built-in zlib, and pulls the literal string
 * operands of the `Tj`/`TJ` text-showing operators. This is sufficient to
 * assert that specific strings (name, section headings, project titles)
 * are present as real, extractable text in the generated PDF — the actual
 * property this test suite cares about (ATS/selectable text, not images).
 * See docs/TEST_LOG.md for why a heavier dependency (pdf-parse/pdfjs-dist)
 * was intentionally avoided.
 */
function unescapePdfString(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === "n") { out += "\n"; i++; }
      else if (next === "r") { out += "\r"; i++; }
      else if (next === "t") { out += "\t"; i++; }
      else if (next === "(" || next === ")" || next === "\\") { out += next; i++; }
      else if (/[0-7]/.test(next ?? "")) {
        const octal = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? "";
        out += String.fromCharCode(parseInt(octal, 8));
        i += octal.length;
      } else {
        out += next ?? "";
        i++;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function hexStringToText(hex) {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

const tokenRegex = /\(((?:\\.|[^()\\])*)\)|<([0-9A-Fa-f\s]+)>/g;

function tokensToText(fragment) {
  let text = "";
  let match;
  tokenRegex.lastIndex = 0;
  while ((match = tokenRegex.exec(fragment))) {
    text += match[1] !== undefined ? unescapePdfString(match[1]) : hexStringToText(match[2]);
  }
  return text;
}

/**
 * PDF text-showing operators use either literal `(...)` strings or hex `<...>`
 * strings (both appear in Tj and in TJ arrays); word spacing within one show
 * operation is already encoded in the string bytes, so tokens inside a single
 * `BT ... ET` text object are joined directly. A newline is inserted between
 * separate text objects so unrelated text runs never accidentally merge into
 * one word for the purposes of substring assertions in tests.
 */
function extractShowOperators(content) {
  return content
    .split(/\bET\b/)
    .map((block) => tokensToText(block))
    .join("\n");
}

export function extractPdfText(buffer) {
  if (buffer.includes(Buffer.from("/ToUnicode"))) return extractUnicodePdfText(buffer);
  const latin1 = buffer.toString("latin1");
  let combined = "";
  const streamRegex = /<<([^>]*?)>>\s*stream\r?\n([\s\S]*?)endstream/g;
  let match;
  while ((match = streamRegex.exec(latin1))) {
    const dict = match[1];
    const body = match[2];
    if (!/\/Filter\s*\/FlateDecode/.test(dict)) continue;
    try {
      const raw = Buffer.from(body, "latin1");
      const inflated = inflateSync(raw).toString("latin1");
      combined += extractShowOperators(inflated);
    } catch {
      // Not a flate content stream (e.g. an embedded object) — skip.
    }
  }
  return combined;
}
