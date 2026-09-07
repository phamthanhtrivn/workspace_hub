import { useEffect } from "react";

interface CalendarKeyboardShortcuts {
  onCreate: () => void;
  onToday: () => void;
  onViewChange: (view: string) => void;
}

const CALENDAR_SHORTCUT_VIEWS: Record<string, string> = {
  m: "dayGridMonth",
  w: "timeGridWeek",
  d: "timeGridDay",
  a: "listWeek",
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function useCalendarKeyboardShortcuts({
  onCreate,
  onToday,
  onViewChange,
}: CalendarKeyboardShortcuts) {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        isEditableTarget(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "c") onCreate();
      if (key === "t") onToday();
      if (CALENDAR_SHORTCUT_VIEWS[key]) {
        onViewChange(CALENDAR_SHORTCUT_VIEWS[key]);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [onCreate, onToday, onViewChange]);
}
