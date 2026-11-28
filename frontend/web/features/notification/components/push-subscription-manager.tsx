"use client";

import { useEffect } from "react";
import { store, useAppSelector } from "@/store/store";
import { urlBase64ToUint8Array } from "../utils/push-subscription.utils";
import { getPushVapidPublicKey, savePushSubscription } from '../api/push-subscription.api';
import { getPushSetupDiagnostic, type PushSetupStep } from '../utils/push-setup-diagnostic';

const loggedPushSetupFailures = new Set<string>();

export default function PushSubscriptionManager() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken && "serviceWorker" in navigator) {
      let cancelled = false;
      void navigator.serviceWorker.getRegistration().then(async registration => {
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled && !store.getState().auth.accessToken) await subscription?.unsubscribe();
      }).catch(() => undefined);
      return () => { cancelled = true; };
    }
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
      let step: PushSetupStep = 'permission';
      let endpoint: string | undefined;
      try {
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (isCancelled || permission !== "granted") {
          return;
        }

        step = 'service-worker';
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        step = 'vapid-key';
        const vapidPublicKey = await getPushVapidPublicKey(accessToken);

        step = 'browser-subscription';
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        if (isCancelled) return;
        endpoint = subscription.endpoint;
        step = 'save-subscription';
        await savePushSubscription(accessToken, subscription.toJSON());
        loggedPushSetupFailures.clear();
      } catch (error) {
        if (isCancelled) return;
        const diagnostic = getPushSetupDiagnostic(error, step, endpoint);
        const key = JSON.stringify(diagnostic);
        if (!loggedPushSetupFailures.has(key)) {
          loggedPushSetupFailures.add(key);
          console.warn(`Web Push setup skipped [${diagnostic.step}]: ${diagnostic.reason}`, diagnostic);
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
