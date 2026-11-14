"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

/** Same-page state only. Next.js integrates the native history API with useSearchParams. */
export function useUrlQuery() {
  const params = useSearchParams();
  const updateQuery = useCallback(
    (
      transform: (current: URLSearchParams) => URLSearchParams,
      mode: "push" | "replace" = "replace",
    ) => {
      const current = new URL(window.location.href);
      const query = transform(new URLSearchParams(current.search)).toString();
      const destination = `${current.pathname}${query ? `?${query}` : ""}${current.hash}`;
      if (destination === `${current.pathname}${current.search}${current.hash}`)
        return;
      if (mode === "push") window.history.pushState(null, "", destination);
      else window.history.replaceState(null, "", destination);
    },
    [],
  );

  return { params, updateQuery };
}
