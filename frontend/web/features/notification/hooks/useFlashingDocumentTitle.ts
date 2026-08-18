import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DOCUMENT_TITLE,
  getFlashingTitle,
} from "../utils/notification-alert.utils";

export function useFlashingDocumentTitle(message: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const resetTitle = () => {
      setCount(0);
      document.title = DEFAULT_DOCUMENT_TITLE;
    };

    window.addEventListener("focus", resetTitle);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTitle();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", resetTitle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (count === 0) {
      document.title = DEFAULT_DOCUMENT_TITLE;
      return;
    }

    let isDefaultTitle = false;
    const interval = setInterval(() => {
      document.title = isDefaultTitle
        ? DEFAULT_DOCUMENT_TITLE
        : getFlashingTitle(count, message);
      isDefaultTitle = !isDefaultTitle;
    }, 1500);

    return () => {
      clearInterval(interval);
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [count, message]);

  const increment = useCallback(() => setCount((value) => value + 1), []);
  const reset = useCallback(() => setCount(0), []);

  return useMemo(() => ({ increment, reset }), [increment, reset]);
}
