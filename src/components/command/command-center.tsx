"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { PublicCommandData } from "@/features/command-palette/commands";

import { CommandCenterContext, type CommandCenterMode } from "./command-context";

// Only the shortcut listener and context live in the initial public bundle.
// The dialogs are fetched on first open.
const CommandPalette = dynamic(() => import("./command-palette").then((module) => module.CommandPalette), { ssr: false });
const TerminalDialog = dynamic(() => import("./terminal-dialog").then((module) => module.TerminalDialog), { ssr: false });

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("[data-command-surface]")) return false; // our own inputs may toggle the palette
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function CommandCenterProvider({ data, children }: { data: PublicCommandData; children: ReactNode }) {
  const [mode, setMode] = useState<CommandCenterMode | null>(null);
  const open = useCallback((next: CommandCenterMode) => setMode(next), []);
  const close = useCallback(() => setMode(null), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      // Do not hijack Ctrl/Cmd+K while the visitor is typing in a regular field,
      // and do not stack on top of another open overlay (e.g. gallery lightbox).
      if (isEditableTarget(event.target)) return;
      if (!mode && document.documentElement.dataset.overlay === "open") return;
      event.preventDefault();
      setMode((current) => (current === "palette" ? null : "palette"));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  const api = useMemo(() => ({ open }), [open]);

  return <CommandCenterContext.Provider value={api}>
    {children}
    {mode === "palette" && <CommandPalette data={data} onClose={close} onOpenTerminal={() => setMode("terminal")} />}
    {mode === "terminal" && <TerminalDialog data={data} onClose={close} />}
  </CommandCenterContext.Provider>;
}
