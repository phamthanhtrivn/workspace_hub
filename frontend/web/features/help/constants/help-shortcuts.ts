import type { HelpShortcut } from "../types";
import { HELP_TOPICS } from "./help-topics";

export const HELP_OPEN_KEY = "?";
export const NAVIGATION_PREFIX_KEY = "g";
export const SHORTCUT_SEQUENCE_TIMEOUT_MS = 1000;
export const SHORTCUT_PREFERENCE_KEY = "workspacehub:keyboard-shortcuts:v1";

const CALENDAR_VIEW_SHORTCUTS = [
  { key: "d", view: "timeGridDay", action: "Day view" },
  { key: "w", view: "timeGridWeek", action: "Week view" },
  { key: "m", view: "dayGridMonth", action: "Month view" },
  { key: "a", view: "listWeek", action: "Week agenda" },
  { key: "y", view: "listYear", action: "Year list" },
] as const;
export const CALENDAR_SHORTCUT_VIEWS: Readonly<Record<string, string>> =
  Object.fromEntries(
    CALENDAR_VIEW_SHORTCUTS.map(({ key, view }) => [key, view]),
  );
export const CALENDAR_CREATE_KEY = "c";
export const CALENDAR_TODAY_KEY = "t";
export const DOCUMENT_SEARCH_KEY = "k";

export const HELP_SHORTCUTS: readonly HelpShortcut[] = [
  {
    id: "help",
    topic: "global",
    action: "Open Help & shortcuts",
    keys: [HELP_OPEN_KEY],
    note: "Outside text fields and overlays. Available even when app shortcuts are off.",
    alwaysEnabled: true,
  },
  ...HELP_TOPICS.flatMap((topic) =>
    "href" in topic
      ? [
          {
            id: `go-${topic.id}`,
            topic: "global" as const,
            action: `Go to ${topic.label}`,
            keys: [
              NAVIGATION_PREFIX_KEY.toUpperCase(),
              topic.key.toUpperCase(),
            ],
            note: "Press one key, then the other within one second.",
          },
        ]
      : [],
  ),
  {
    id: "calendar-create",
    topic: "calendar",
    action: "Create an event",
    keys: [CALENDAR_CREATE_KEY.toUpperCase()],
  },
  {
    id: "calendar-today",
    topic: "calendar",
    action: "Go to today",
    keys: [CALENDAR_TODAY_KEY.toUpperCase()],
  },
  ...CALENDAR_VIEW_SHORTCUTS.map(({ key, action }) => ({
    id: `calendar-${key}`,
    topic: "calendar" as const,
    action,
    keys: [key.toUpperCase()],
  })),
  {
    id: "document-search",
    topic: "documents",
    relatedTopics: ["projects"],
    action: "Focus document search",
    keys: ["Ctrl", DOCUMENT_SEARCH_KEY.toUpperCase()],
    macKeys: ["⌘", DOCUMENT_SEARCH_KEY.toUpperCase()],
    note: "Requires a visible Documents explorer, including Project Documents.",
  },
  {
    id: "keyboard-next",
    topic: "global",
    action: "Move to the next control",
    keys: ["Tab"],
    alwaysEnabled: true,
  },
  {
    id: "composer-send",
    topic: "messages",
    relatedTopics: ["ai", "dashboard", "projects", "calendar"],
    action: "Send from a chat or AI composer",
    keys: ["Enter"],
    note: "While the composer is focused. An open mention suggestion uses Enter to select the person instead.",
    alwaysEnabled: true,
  },
  {
    id: "composer-newline",
    topic: "messages",
    relatedTopics: ["ai", "dashboard", "projects", "calendar"],
    action: "Add a new line in the composer",
    keys: ["Shift", "Enter"],
    note: "In chat and AI composers. Markdown lists can continue on the next line.",
    alwaysEnabled: true,
  },
  {
    id: "mention-navigation",
    topic: "messages",
    action: "Move through mention suggestions",
    keys: ["↑ / ↓"],
    note: "While suggestions are open. Enter selects a suggestion; Escape dismisses them.",
    alwaysEnabled: true,
  },
  {
    id: "keyboard-activate",
    topic: "global",
    action: "Activate a focused button",
    keys: ["Enter"],
    note: "Space also activates buttons.",
    alwaysEnabled: true,
  },
  {
    id: "pomodoro-collapse",
    topic: "pomodoro",
    action: "Collapse the floating focus timer",
    keys: ["Esc"],
    note: "While focus is inside the expanded floating timer.",
    alwaysEnabled: true,
  },
  {
    id: "keyboard-previous",
    topic: "global",
    action: "Move to the previous control",
    keys: ["Shift", "Tab"],
    alwaysEnabled: true,
  },
  {
    id: "keyboard-close",
    topic: "global",
    action: "Close a menu or dismissible dialog",
    keys: ["Esc"],
    note: "Unsaved changes may require confirmation.",
    alwaysEnabled: true,
  },
];
