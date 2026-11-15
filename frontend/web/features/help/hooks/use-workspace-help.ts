"use client";

import { createContext, useContext } from "react";

export interface WorkspaceHelpContextValue {
  openHelp: () => void;
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
}

export const WorkspaceHelpContext =
  createContext<WorkspaceHelpContextValue | null>(null);

export function useWorkspaceHelp() {
  const context = useContext(WorkspaceHelpContext);
  if (!context)
    throw new Error("Workspace help requires WorkspaceHelpProvider.");

  return context;
}
