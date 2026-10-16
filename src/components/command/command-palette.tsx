"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ModalDialog } from "@/components/ui/modal-dialog";
import { buildCommandIndex, commandGroupOrder, filterCommands, type CommandItem, type PublicCommandData } from "@/features/command-palette/commands";
import { toSafeDestination } from "@/features/navigation/safe-href";

type Props = { data: PublicCommandData; onClose: () => void; onOpenTerminal: () => void };

export function CommandPalette({ data, onClose, onOpenTerminal }: Props) {
  const router = useRouter();
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const index = useMemo(() => buildCommandIndex(data), [data]);
  const groups = useMemo(() => {
    const results = filterCommands(index, query);
    return commandGroupOrder
      .map((group) => ({ group, items: results.filter((item) => item.group === group) }))
      .filter((entry) => entry.items.length);
  }, [index, query]);
  const flat = useMemo(() => groups.flatMap((entry) => entry.items), [groups]);
  const active = flat[Math.min(activeIndex, flat.length - 1)];
  const optionId = (item: CommandItem) => `${baseId}-option-${item.id}`;
  const activeId = active ? optionId(active) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function run(item: CommandItem | undefined) {
    if (!item) return;
    if (item.action === "open-terminal") { onOpenTerminal(); return; }
    // Destinations come from the server-built allowlisted index, never from the query text.
    const destination = item.href ? toSafeDestination(item.href, Boolean(item.external)) : null;
    if (!destination) return;
    onClose();
    if (destination.external) window.open(destination.href, "_blank", "noopener,noreferrer");
    else if (destination.href.startsWith("/api/")) window.open(destination.href, "_blank", "noopener");
    else router.push(destination.href);
  }

  const titleId = `${baseId}-title`;
  const hintId = `${baseId}-hint`;
  const listId = `${baseId}-list`;

  return <ModalDialog labelledBy={titleId} describedBy={hintId} className="command-dialog" onClose={onClose} initialFocusRef={inputRef}>
    <div data-command-surface>
      <h2 id={titleId} className="sr-only">Komut paleti</h2>
      <div className="command-search">
        <label htmlFor={`${baseId}-input`} className="sr-only">Sayfa, proje veya komut ara</label>
        <span aria-hidden="true" className="command-prompt">/</span>
        <input
          ref={inputRef}
          id={`${baseId}-input`}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          placeholder="Sayfa, proje veya komut ara"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((current) => (flat.length ? (Math.min(current, flat.length - 1) + 1) % flat.length : 0)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => (flat.length ? (Math.min(current, flat.length - 1) - 1 + flat.length) % flat.length : 0)); }
            else if (event.key === "Home") { event.preventDefault(); setActiveIndex(0); }
            else if (event.key === "End") { event.preventDefault(); setActiveIndex(Math.max(0, flat.length - 1)); }
            else if (event.key === "Enter") { event.preventDefault(); run(active); }
          }}
        />
        <button type="button" className="command-close" onClick={onClose}>Esc<span className="sr-only"> — kapat</span></button>
      </div>
      <div id={listId} role="listbox" aria-label="Komutlar" className="command-list">
        {groups.map(({ group, items }) => <div role="group" key={group} aria-labelledby={`${baseId}-${group}`}>
          <div id={`${baseId}-${group}`} className="command-group-label" role="presentation">{group}</div>
          {items.map((item) => {
            const selected = item === active;
            return <div
              key={item.id}
              id={optionId(item)}
              role="option"
              aria-selected={selected}
              className="command-option"
              onMouseMove={() => { if (!selected) setActiveIndex(flat.indexOf(item)); }}
              onClick={() => run(item)}
            >
              <span className="command-option-label">{item.label}</span>
              {item.hint && <span className="command-option-hint">{item.hint}</span>}
              {item.external && <span className="command-option-meta">Yeni sekme<span className="sr-only">de açılır</span></span>}
            </div>;
          })}
        </div>)}
        {!flat.length && <p className="command-empty">Eşleşen sonuç yok.</p>}
      </div>
      <p className="sr-only" aria-live="polite">{flat.length} sonuç</p>
      <p id={hintId} className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> gezin</span><span><kbd>Enter</kbd> aç</span><span><kbd>Esc</kbd> kapat</span></p>
    </div>
  </ModalDialog>;
}
