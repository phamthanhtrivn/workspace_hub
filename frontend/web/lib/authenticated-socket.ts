import type { Socket } from "socket.io-client";
import { store } from "@/store/store";
import {
  endSession,
  sessionRecovery,
} from "@/features/auth/api/session-recovery";
import { SocketRecovery } from "./socket-recovery";
import { SOCKET_RETRY } from "./socket-session.constants";

const logTimes = new Map<string, number>();

export function attachSocketRecovery(
  socket: Socket,
  token: string,
  service: string,
): () => void {
  const owner = store.getState().auth.userId;
  const recovery = new SocketRecovery(socket, token, {
    refresh: (failedToken) => sessionRecovery.refreshForToken(failedToken),
    terminate: async (failedToken) => {
      const snapshot = store.getState().auth;
      if (snapshot.accessToken === failedToken && snapshot.userId === owner)
        await endSession(snapshot);
    },
    isOnline: () =>
      typeof navigator === "undefined" || navigator.onLine !== false,
    schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: (timer) => clearTimeout(timer),
    random: Math.random,
    warn: (code) => {
      const key = `${service}:${code}`;
      const now = Date.now();
      if (now - (logTimes.get(key) ?? 0) < SOCKET_RETRY.logThrottleMs) return;
      logTimes.set(key, now);
      console.warn("Socket unavailable", { service, code });
    },
  });
  const dispose = () => {
    unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", recovery.online);
      window.removeEventListener("offline", recovery.offline);
    }
    recovery.dispose();
  };
  const unsubscribe = store.subscribe(() => {
    const current = store.getState().auth;
    if (current.userId !== owner || !current.accessToken) dispose();
    else recovery.updateToken(current.accessToken);
  });
  if (typeof window !== "undefined") {
    window.addEventListener("online", recovery.online);
    window.addEventListener("offline", recovery.offline);
  }
  recovery.start();
  return dispose;
}
