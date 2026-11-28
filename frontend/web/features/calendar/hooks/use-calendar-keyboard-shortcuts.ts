import { useEffect } from "react";
import { useWorkspaceHelp } from "@/features/help/hooks/use-workspace-help";
import { shouldIgnoreShortcut } from "@/features/help/utils/keyboard-shortcuts";
import {
  CALENDAR_CREATE_KEY,
  CALENDAR_TODAY_KEY,
  CALENDAR_SHORTCUT_VIEWS,
} from "@/features/help/constants/help-shortcuts";

interface CalendarKeyboardShortcuts {
  onCreate: () => void;
  onToday: () => void;
  onViewChange: (view: string) => void;
}

export function useCalendarKeyboardShortcuts({
  onCreate,
  onToday,
  onViewChange,
}: CalendarKeyboardShortcuts) {
  const { shortcutsEnabled } = useWorkspaceHelp();
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        !shortcutsEnabled ||
        shouldIgnoreShortcut(event) ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === CALENDAR_CREATE_KEY) {
        event.preventDefault();
        onCreate();
      }
      if (key === CALENDAR_TODAY_KEY) {
        event.preventDefault();
        onToday();
      }
      if (CALENDAR_SHORTCUT_VIEWS[key]) {
        event.preventDefault();
        onViewChange(CALENDAR_SHORTCUT_VIEWS[key]);
      }
    };

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, [shortcutsEnabled, onCreate, onToday, onViewChange]);
}
