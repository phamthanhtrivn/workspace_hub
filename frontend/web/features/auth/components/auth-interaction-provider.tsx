"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AUTH_ACTIVITY_COPY, type AuthAction } from "../types/auth-activity.constants";

type AuthActivity = {
  action: AuthAction;
  phase: "pending" | "success" | "error" | "redirecting";
  message: string;
};

type AuthInteraction = {
  activity: AuthActivity | null;
  busy: boolean;
  isLocked: () => boolean;
  begin: (action: AuthAction) => boolean;
  progress: (action: AuthAction, message: string) => void;
  complete: (action: AuthAction) => void;
  fail: (action: AuthAction, message?: string) => void;
  redirect: (action: AuthAction, message: string) => void;
  clear: () => void;
};

const AuthInteractionContext = createContext<AuthInteraction | null>(null);

function AuthInteractionProvider({ children }: { children: ReactNode }) {
  const [activity, setActivity] = useState<AuthActivity | null>(null);
  // The ref blocks competing methods synchronously, before a React render.
  const request = useRef<{ action: AuthAction; redirecting: boolean } | null>(null);
  const isLocked = useCallback(() => request.current !== null, []);
  const begin = useCallback((action: AuthAction) => {
    if (request.current) return false;
    request.current = { action, redirecting: false };
    setActivity({ action, phase: "pending", message: AUTH_ACTIVITY_COPY[action].pending });
    return true;
  }, []);
  const complete = useCallback((action: AuthAction) => {
    if (request.current?.action !== action || request.current.redirecting) return;
    request.current = null;
    setActivity({ action, phase: "success", message: AUTH_ACTIVITY_COPY[action].success });
  }, []);
  const progress = useCallback((action: AuthAction, message: string) => {
    if (request.current?.action !== action || request.current.redirecting) return;
    setActivity({ action, phase: "pending", message });
  }, []);
  const fail = useCallback((action: AuthAction, message?: string) => {
    if (request.current && request.current.action !== action) return;
    request.current = null;
    setActivity(message ? { action, phase: "error", message } : null);
  }, []);
  const redirect = useCallback((action: AuthAction, message: string) => {
    if (request.current?.action !== action) return;
    request.current.redirecting = true;
    setActivity({ action, phase: "redirecting", message });
  }, []);
  const clear = useCallback(() => {
    if (!request.current) setActivity(null);
  }, []);
  const busy = activity?.phase === "pending" || activity?.phase === "redirecting";
  const value = useMemo(() => ({ activity, busy, isLocked, begin, progress, complete, fail, redirect, clear }),
    [activity, busy, isLocked, begin, progress, complete, fail, redirect, clear]);

  return <AuthInteractionContext value={value}>{children}</AuthInteractionContext>;
}

export function AuthInteractionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Auth layouts persist between pages. Each destination needs a fresh lock.
  return <AuthInteractionProvider key={pathname}>{children}</AuthInteractionProvider>;
}

export function useAuthInteraction() {
  const interaction = useContext(AuthInteractionContext);
  if (!interaction) throw new Error("Auth controls require AuthInteractionBoundary");
  return interaction;
}
