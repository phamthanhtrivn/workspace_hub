"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearDocumentTitleAlerts,
  composeDocumentTitle,
  DOCUMENT_TITLE_FLASH_INTERVAL_MS,
  hasDocumentTitleAlerts,
  refreshDocumentTitle,
  subscribeDocumentTitle,
} from "@/lib/document-title";

function changesTitle(mutation: MutationRecord): boolean {
  const isTitle = (node: Node | null) => node?.nodeName === "TITLE";
  return isTitle(mutation.target) || isTitle(mutation.target.parentNode)
    || [...mutation.addedNodes, ...mutation.removedNodes].some(isTitle);
}

/** One browser-title writer for route metadata, Pomodoro and notification alerts. */
export function DocumentTitleManager() {
  const pathname = usePathname();

  useEffect(() => {
    let flashing = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const writeTitle = () => {
      const hidden = document.visibilityState === "hidden";
      const title = composeDocumentTitle(window.location.pathname, hidden && flashing);
      if (document.head.querySelector("title") && document.title !== title) document.title = title;
    };
    const update = () => {
      if (document.visibilityState === "hidden" && hasDocumentTitleAlerts()) {
        if (!interval) {
          flashing = true;
          interval = setInterval(() => { flashing = !flashing; writeTitle(); }, DOCUMENT_TITLE_FLASH_INTERVAL_MS);
        }
      } else {
        clearInterval(interval);
        interval = undefined;
        flashing = false;
      }
      writeTitle();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") clearDocumentTitleAlerts();
      update();
    };
    const unsubscribe = subscribeDocumentTitle(update);
    // Next can stream route metadata after effects. Reconcile only title mutations.
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(changesTitle)) writeTitle();
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    update();
    return () => {
      unsubscribe();
      observer.disconnect();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  useEffect(() => { refreshDocumentTitle(); }, [pathname]);
  return null;
}
