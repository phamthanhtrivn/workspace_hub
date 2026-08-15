"use client";

import { useEffect } from "react";
import axios from "axios";
import { useAppSelector } from "@/store/store";

let hasLoggedPushSetupFailure = false;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscriptionManager() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (
      !accessToken ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    let isCancelled = false;

    const setupPushSubscription = async () => {
      try {
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (isCancelled || permission !== "granted") {
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await axios.get(
          `${apiUrl}/api/notifications/push/vapid-public-key`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const vapidPublicKey = response.data?.data?.publicKey;
        if (!vapidPublicKey) {
          throw new Error("Failed to retrieve public VAPID key");
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        if (isCancelled) return;

        await axios.post(
          `${apiUrl}/api/notifications/push/subscribe`,
          subscription,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        if (!hasLoggedPushSetupFailure) {
          hasLoggedPushSetupFailure = true;
          const message = axios.isAxiosError(error)
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unknown error";
          console.warn(`Web Push setup skipped: ${message}`);
        }
      }
    };

    setupPushSubscription();

    return () => {
      isCancelled = true;
    };
  }, [accessToken]);

  return null;
}
