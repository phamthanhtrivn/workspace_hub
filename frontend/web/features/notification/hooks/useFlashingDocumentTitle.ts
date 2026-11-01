import { useCallback, useEffect, useId, useMemo } from "react";
import { incrementDocumentTitleAlert, removeDocumentTitleAlert } from "@/lib/document-title";

export function useFlashingDocumentTitle(message: string) {
  const id = useId();
  const increment = useCallback(() => {
    if (document.visibilityState === "hidden") incrementDocumentTitleAlert(id, message);
  }, [id, message]);
  const reset = useCallback(() => removeDocumentTitleAlert(id), [id]);
  useEffect(() => () => removeDocumentTitleAlert(id), [id]);
  return useMemo(() => ({ increment, reset }), [increment, reset]);
}
