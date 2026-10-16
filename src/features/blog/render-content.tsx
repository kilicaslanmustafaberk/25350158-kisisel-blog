import { Fragment, type ReactNode } from "react";

import { normalizeTiptapDocument, type TiptapNode } from "@/features/blog/content-schema";

function renderText(node: TiptapNode, key: number): ReactNode {
  let element: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "link":
        element = (
          <a href={mark.attrs.href} target={mark.attrs.target ?? undefined} rel={mark.attrs.rel ?? undefined}>
            {element}
          </a>
        );
        break;
    }
  }
  return <Fragment key={key}>{element}</Fragment>;
}

function renderChildren(nodes: TiptapNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, index));
}

function renderNode(node: TiptapNode, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "paragraph":
      return <p key={key}>{renderChildren(node.content)}</p>;
    case "heading": {
      const level = (node.attrs?.level as 2 | 3 | undefined) ?? 2;
      return level === 3 ? <h3 key={key}>{renderChildren(node.content)}</h3> : <h2 key={key}>{renderChildren(node.content)}</h2>;
    }
    case "bulletList":
      return <ul key={key}>{renderChildren(node.content)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderChildren(node.content)}</ol>;
    case "listItem":
      return <li key={key}>{renderChildren(node.content)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node.content)}</blockquote>;
    case "codeBlock": {
      const code = (node.content ?? []).map((child) => child.text ?? "").join("");
      return (
        <pre key={key}>
          <code>{code}</code>
        </pre>
      );
    }
    default:
      return null;
  }
}

/**
 * Renders a stored Tiptap document to React elements only. The document is
 * re-normalized here (defense in depth against data tampered outside the
 * validated write path); any node/mark/link outside the allowlist is
 * dropped rather than executed, since this function never touches
 * `dangerouslySetInnerHTML`.
 */
export function renderPostContent(raw: unknown): ReactNode {
  const doc = normalizeTiptapDocument(raw);
  return <div className="post-content">{renderChildren(doc.content)}</div>;
}
