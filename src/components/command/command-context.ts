"use client";

import { createContext, useContext } from "react";

// Kept in its own tiny module so that the shared header/footer can render the
// palette/terminal triggers without pulling the dialogs into the admin bundle.
// Outside the public layout there is no provider and the triggers render nothing.

export type CommandCenterMode = "palette" | "terminal";
export type CommandCenterApi = { open: (mode: CommandCenterMode) => void };

export const CommandCenterContext = createContext<CommandCenterApi | null>(null);

export function useCommandCenter() {
  return useContext(CommandCenterContext);
}
