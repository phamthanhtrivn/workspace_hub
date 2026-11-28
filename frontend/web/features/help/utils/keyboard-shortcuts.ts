import {
  HELP_OPEN_KEY,
  NAVIGATION_PREFIX_KEY,
  SHORTCUT_SEQUENCE_TIMEOUT_MS,
} from "../constants/help-shortcuts";
import { HELP_TOPICS } from "../constants/help-topics";

const EDITABLE_SELECTOR =
  'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"],[role="spinbutton"],[role="grid"]';
const OVERLAY_SELECTOR =
  '[aria-modal="true"]:not([aria-hidden="true"]),[data-slot="dropdown-menu-content"],[data-slot="popover-content"],[data-slot="select-content"],[role="menu"],[role="listbox"]';

export function shouldIgnoreShortcut(event: KeyboardEvent) {
  return (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.keyCode === 229 ||
    (event.target instanceof HTMLElement &&
      (event.target.isContentEditable ||
        Boolean(event.target.closest(EDITABLE_SELECTOR)))) ||
    Boolean(document.querySelector(OVERLAY_SELECTOR))
  );
}

/** The prefix is cleared after any unrelated key, blocked event, blur or timeout. */
export function createWorkspaceShortcutHandler(options: {
  enabled: boolean;
  openHelp: () => void;
  navigate: (href: string) => void;
}) {
  let prefixAt: number | null = null;
  const reset = () => {
    prefixAt = null;
  };

  return {
    reset,
    handle(event: KeyboardEvent) {
      if (
        shouldIgnoreShortcut(event) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        reset();

        return;
      }
      if (event.key === HELP_OPEN_KEY) {
        reset();
        event.preventDefault();
        options.openHelp();

        return;
      }
      if (!options.enabled || event.shiftKey) {
        reset();

        return;
      }
      const key = event.key.toLowerCase();
      const now = Date.now();
      if (prefixAt !== null && now - prefixAt <= SHORTCUT_SEQUENCE_TIMEOUT_MS) {
        reset();
        const destination = HELP_TOPICS.find(
          (topic) => "href" in topic && topic.key === key,
        );
        if (destination && "href" in destination) {
          event.preventDefault();
          options.navigate(destination.href);

          return;
        }
      }
      if (key === NAVIGATION_PREFIX_KEY) {
        prefixAt = now;
        // Keep this key from reaching page-level shortcuts.
        event.preventDefault();
      }
    },
  };
}
