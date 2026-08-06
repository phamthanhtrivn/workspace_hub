"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { ChatEvent } from "@/features/chat/api/chat.events";
import { setActiveConversation } from "@/store/chat/chat-slice";
import { toast } from "react-toastify";
import axios from "axios";

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

export default function PushNotificationManager() {
  const { accessToken, userId: currentUserId } = useAppSelector(
    (state) => state.auth,
  );
  const activeConversationId = useAppSelector(
    (state) => state.chat.activeConversation?.id,
  );
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();

  const subscriptionRef = useRef<any>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Keep active conversation ref synchronized for real-time socket checks
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId || null;
  }, [activeConversationId]);

  useEffect(() => {
    const handleResetTitle = () => {
      setUnreadNotifCount(0);
      document.title = "WorkspaceHub";
    };

    window.addEventListener("focus", handleResetTitle);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResetTitle();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleResetTitle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      setUnreadNotifCount(0);
      document.title = "WorkspaceHub";
    }
  }, [activeConversationId]);

  // Flashing document title effect when user has unread notification messages
  useEffect(() => {
    if (unreadNotifCount === 0) {
      document.title = "WorkspaceHub";
      return;
    }

    let isDefaultTitle = false;
    const interval = setInterval(() => {
      document.title = isDefaultTitle
        ? "WorkspaceHub"
        : `(${unreadNotifCount}) Bạn có tin nhắn mới!`;
      isDefaultTitle = !isDefaultTitle;
    }, 1500);

    return () => {
      clearInterval(interval);
      document.title = "WorkspaceHub";
    };
  }, [unreadNotifCount]);

  // 1. Service Worker & Push Notification Subscription
  useEffect(() => {
    if (
      !accessToken ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    let isSubscribing = false;

    const setupPush = async () => {
      if (isSubscribing) return;
      isSubscribing = true;

      try {
        // Request Notification permission
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.warn("Push notifications permission was denied.");
          return;
        }

        // Register Service Worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Fetch VAPID Public Key from backend API Gateway
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await axios.get(
          `${apiUrl}/api/notifications/push/vapid-public-key`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const vapidPublicKey = res.data?.data?.publicKey;
        if (!vapidPublicKey) {
          throw new Error("Failed to retrieve public VAPID key");
        }

        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

        // Get or Create subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });
        }

        subscriptionRef.current = subscription;

        // Send subscription object to backend to register device
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
      } catch (err) {
        console.error("Error setting up Web Push notifications:", err);
      } finally {
        isSubscribing = false;
      }
    };

    setupPush();
  }, [accessToken]);

  // 2. Real-time In-app Sound & Toast Alerts via Socket.io
  useEffect(() => {
    if (!accessToken || !currentUserId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      // 1. Ignore if sender is current user
      if (message.senderId === currentUserId) return;

      // 2. Ignore if user is currently active in this conversation room
      const isViewingRoom =
        message.conversationId === activeConversationIdRef.current;
      if (isViewingRoom) return;

      // 3. Retrieve muted state of the conversation from cached queries
      const cachedData: any = queryClient.getQueryData([
        "conversations",
        currentUserId,
      ]);
      const conversations = cachedData?.conversations || [];
      const conv = conversations.find(
        (c: any) => c.id === message.conversationId,
      );

      const meInConv = conv?.members?.find(
        (m: any) => m.userId === currentUserId,
      );
      const isMuted = meInConv?.muted || false;

      // 4. Check if current user is mentioned (specifically or via @All)
      const isMentioned =
        message.mentions?.includes(currentUserId) ||
        message.mentions?.includes("all");

      // Rule: Play sound & display alert if NOT muted OR if user is Tagged/Mentioned
      if (!isMuted || isMentioned) {
        // Play audio alert
        const audio = new Audio("/assets/sounds/chat_notification.mp3");
        audio.play().catch((err) => {
          console.warn(
            "Audio alert play blocked (User must interact with page first):",
            err,
          );
        });

        // Dynamic Document Title update (only increments count, side-effect handled by useEffect)
        if (
          document.visibilityState !== "visible" ||
          message.conversationId !== activeConversationIdRef.current
        ) {
          setUnreadNotifCount((prev) => prev + 1);
        }
      }
    };

    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
    };
  }, [accessToken, currentUserId, queryClient, dispatch, router]);

  // 3. Listen for Navigation messages from Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NAVIGATE") {
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
