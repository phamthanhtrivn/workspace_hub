"use client";

import { useEffect, useRef } from "react";
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

  // Keep active conversation ref synchronized for real-time socket checks
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId || null;
  }, [activeConversationId]);

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
          `${apiUrl}/notifications/push/vapid-public-key`,
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
          `${apiUrl}/notifications/push/subscribe`,
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

      // 2. Ignore if user is currently looking at this conversation room in focused browser tab
      const isViewingRoom =
        message.conversationId === activeConversationIdRef.current &&
        document.visibilityState === "visible";
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

      // 4. Check if current user is mentioned
      const isMentioned = message.mentions?.includes(currentUserId);

      // Rule: Play sound & display Toast if NOT muted OR if user is Tagged/Mentioned
      if (!isMuted || isMentioned) {
        // Play audio alert
        const audio = new Audio("/assets/sounds/notification.wav");
        audio.play().catch((err) => {
          console.warn(
            "Audio alert play blocked (User must interact with page first):",
            err,
          );
        });

        // Resolve sender information
        const senderProfile =
          cachedData?.profiles?.[message.senderId] ||
          conv?.members?.find((m: any) => m.userId === message.senderId);

        const senderName =
          senderProfile?.fullName || message.senderName || "Người dùng";
        const senderAvatar = senderProfile?.avatarUrl || message.senderAvatar;

        // Trigger in-app toast notification card
        toast.info(
          <div
            className="flex items-center gap-3 py-1 cursor-pointer"
            onClick={() => {
              if (conv) {
                dispatch(setActiveConversation(conv));
                router.push(`/chat`);
              } else {
                router.push(`/chat?id=${message.conversationId}`);
              }
            }}
          >
            {senderAvatar ? (
              <img
                src={senderAvatar}
                alt={senderName}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">
                {senderName[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-gray-800 truncate">
                {senderName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {message.content || "Đã gửi một tệp đính kèm..."}
              </p>
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          },
        );
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
