"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServiceWorkerNavigationListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE") {
        router.push(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [router]);

  return null;
}
