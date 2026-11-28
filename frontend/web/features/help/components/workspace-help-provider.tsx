"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceHelpContext } from "../hooks/use-workspace-help";
import { useShortcutPreference } from "../hooks/use-shortcut-preference";
import { createWorkspaceShortcutHandler } from "../utils/keyboard-shortcuts";

const HelpDialog = dynamic(() =>
  import("@/components/common/workspace-help-dialog").then(
    (module) => module.WorkspaceHelpDialog,
  ),
);

export function WorkspaceHelpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useShortcutPreference();
  const router = useRouter();
  const pathname = usePathname();
  const openHelp = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const shortcuts = createWorkspaceShortcutHandler({
      enabled: shortcutsEnabled,
      openHelp,
      navigate: (href) => router.push(href),
    });
    // Capture navigation sequences before Calendar handles single-letter keys.
    window.addEventListener("keydown", shortcuts.handle, true);
    window.addEventListener("blur", shortcuts.reset);
    window.addEventListener("pointerdown", shortcuts.reset, true);
    window.addEventListener("focusin", shortcuts.reset);

    return () => {
      window.removeEventListener("keydown", shortcuts.handle, true);
      window.removeEventListener("blur", shortcuts.reset);
      window.removeEventListener("pointerdown", shortcuts.reset, true);
      window.removeEventListener("focusin", shortcuts.reset);
    };
  }, [shortcutsEnabled, openHelp, router, pathname]);
  const context = useMemo(
    () => ({ openHelp, shortcutsEnabled, setShortcutsEnabled }),
    [openHelp, shortcutsEnabled, setShortcutsEnabled],
  );

  return (
    <WorkspaceHelpContext.Provider value={context}>
      {children}
      {open && <HelpDialog open onClose={() => setOpen(false)} />}
    </WorkspaceHelpContext.Provider>
  );
}
