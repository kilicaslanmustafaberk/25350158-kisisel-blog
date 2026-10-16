"use client";

import TiptapLink from "@tiptap/extension-link";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  content: unknown;
  onChange: (json: unknown) => void;
};

const emptyDocument = { type: "doc", content: [{ type: "paragraph" }] };

export function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: false,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    ],
    content: content ?? emptyDocument,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON()),
  });

  if (!editor) return null;

  return (
    <div className="tiptap-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Bağlantı URL'si (http, https veya mailto)", previous || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const items: { key: string; label: string; ariaLabel: string; onClick: () => void; active?: boolean; disabled?: boolean }[] = [
    { key: "bold", label: "B", ariaLabel: "Kalın", onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { key: "italic", label: "I", ariaLabel: "İtalik", onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { key: "strike", label: "S", ariaLabel: "Üstü çizili", onClick: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
    { key: "code", label: "</>", ariaLabel: "Satır içi kod", onClick: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
    { key: "h2", label: "H2", ariaLabel: "Başlık 2", onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { key: "h3", label: "H3", ariaLabel: "Başlık 3", onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { key: "bulletList", label: "Liste", ariaLabel: "Madde işaretli liste", onClick: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { key: "orderedList", label: "1. Liste", ariaLabel: "Numaralı liste", onClick: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { key: "blockquote", label: "Alıntı", ariaLabel: "Alıntı bloğu", onClick: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
    { key: "codeBlock", label: "Kod bloğu", ariaLabel: "Kod bloğu", onClick: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
    { key: "hr", label: "Çizgi", ariaLabel: "Yatay çizgi ekle", onClick: () => editor.chain().focus().setHorizontalRule().run() },
    { key: "link", label: "Link", ariaLabel: "Bağlantı ekle veya düzenle", onClick: setLink, active: editor.isActive("link") },
    { key: "undo", label: "Geri al", ariaLabel: "Geri al", onClick: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
    { key: "redo", label: "Yinele", ariaLabel: "Yinele", onClick: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
  ];

  return (
    <div className="tiptap-toolbar" role="toolbar" aria-label="Biçimlendirme araç çubuğu">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="tiptap-toolbar-button"
          aria-label={item.ariaLabel}
          aria-pressed={item.active ?? false}
          data-active={item.active || undefined}
          disabled={item.disabled}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
