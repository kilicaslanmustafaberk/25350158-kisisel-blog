"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ModalDialog } from "@/components/ui/modal-dialog";
import type { PublicCommandData } from "@/features/command-palette/commands";
import { MAX_TERMINAL_INPUT, runTerminalCommand, type TerminalLine } from "@/features/terminal/registry";

type Entry = { id: number; command: string | null; lines: TerminalLine[] };

const HISTORY_LIMIT = 30;
const welcome: Entry = { id: 0, command: null, lines: [{ text: "Bu gerçek bir shell değildir; yalnız tanımlı site komutları çalışır.", tone: "muted" }, { text: "Komut listesi için help yazın." }] };

export function TerminalDialog({ data, onClose }: { data: PublicCommandData; onClose: () => void }) {
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [entries, setEntries] = useState<Entry[]>([welcome]);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  // Memory-only history: it is never stored in localStorage, cookies or the database.
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [entries]);

  function submit() {
    const command = value.trim().slice(0, MAX_TERMINAL_INPUT);
    setValue("");
    setHistoryIndex(null);
    if (!command) return;
    setHistory((current) => [...current.filter((item) => item !== command), command].slice(-HISTORY_LIMIT));
    const result = runTerminalCommand(command, data);
    if (result.kind === "clear") { setEntries([]); setStatus("Ekran temizlendi."); return; }
    setStatus("");
    setEntries((current) => [...current, { id: nextId.current++, command, lines: result.lines }].slice(-50));
  }

  function browseHistory(direction: -1 | 1) {
    if (!history.length) return;
    const start = historyIndex ?? history.length;
    const next = Math.min(history.length, Math.max(0, start + direction));
    setHistoryIndex(next === history.length ? null : next);
    setValue(next === history.length ? "" : history[next]);
  }

  const titleId = `${baseId}-title`;
  const inputId = `${baseId}-input`;

  return <ModalDialog labelledBy={titleId} className="terminal-dialog" onClose={onClose} initialFocusRef={inputRef}>
    <div data-command-surface className="terminal-shell">
      <header className="terminal-header">
        <h2 id={titleId}>Terminal</h2>
        <span className="terminal-caption">site komutları · salt okunur</span>
        <button type="button" className="command-close" onClick={onClose}>Esc<span className="sr-only"> — terminali kapat</span></button>
      </header>
      <div ref={outputRef} className="terminal-output" role="log" aria-live="polite" aria-label="Terminal çıktısı" tabIndex={0}>
        {entries.map((entry) => <div key={entry.id} className="terminal-entry">
          {entry.command !== null && <p className="terminal-command"><span aria-hidden="true">&gt; </span><span className="sr-only">Komut: </span>{entry.command}</p>}
          {entry.lines.map((line, index) => <p key={index} className={line.tone ? `terminal-line terminal-${line.tone}` : "terminal-line"}>
            {line.href
              ? line.external
                ? <a href={line.href} target="_blank" rel="noopener noreferrer">{line.text}<span className="sr-only"> (yeni sekmede açılır)</span></a>
                : line.href.startsWith("/api/")
                  ? <a href={line.href} target="_blank" rel="noopener">{line.text}<span className="sr-only"> (yeni sekmede açılır)</span></a>
                  : <Link href={line.href} onClick={onClose}>{line.text}</Link>
              : line.text}
          </p>)}
        </div>)}
      </div>
      <p className="sr-only" aria-live="polite">{status}</p>
      <form className="terminal-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label htmlFor={inputId} className="terminal-prompt"><span aria-hidden="true">&gt;</span><span className="sr-only">Komut girin</span></label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          maxLength={MAX_TERMINAL_INPUT}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-describedby={`${baseId}-help`}
          onChange={(event) => { setValue(event.target.value); setHistoryIndex(null); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") { event.preventDefault(); browseHistory(-1); }
            else if (event.key === "ArrowDown") { event.preventDefault(); browseHistory(1); }
          }}
        />
      </form>
      <p id={`${baseId}-help`} className="terminal-help">help · about · projects · skills · blog · cv · contact · github · clear — ↑/↓ geçmiş</p>
    </div>
  </ModalDialog>;
}
