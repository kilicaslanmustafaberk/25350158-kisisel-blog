"use client";

import { TerminalIcon } from "@/components/ui/icons";

import { useCommandCenter } from "./command-context";

/** Small developer easter egg entry point; renders nothing outside the public layout. */
export function TerminalTrigger() {
  const commandCenter = useCommandCenter();
  if (!commandCenter) return null;
  return <button type="button" aria-label="Terminal" className="terminal-trigger" onClick={() => commandCenter.open("terminal")}>
    <TerminalIcon />
    <span>Terminal</span>
  </button>;
}
