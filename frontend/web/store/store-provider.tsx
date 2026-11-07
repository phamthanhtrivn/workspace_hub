"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "./store";
import { setCredentials } from "./auth/auth-slice";
import "@/lib/interceptors";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshApi } from "@/features/auth/api/auth.api";
import { endSession, isAuthenticationFailure } from "@/features/auth/api/session-recovery";
import { clearCopiedMessage } from "@/features/chat/utils/message-clipboard";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { notificationSocketService } from "@/features/notification/api/notification-socket.service";
import { projectSocketService } from "@/features/project/api/project-socket.service";
import {
  getLoginRedirectPath,
  getReturnToFromSearch,
} from "@/features/auth/utils/auth-redirect";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/",
  "/documents/shared",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

function shouldRedirectAuthenticatedUser(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname === "/register";
}

function getCurrentSearch() {
  if (typeof window === "undefined") return "";

  return window.location.search;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    let userId = store.getState().auth.userId;
    const unsubscribe = store.subscribe(() => {
      const nextUserId = store.getState().auth.userId;
      if (nextUserId !== userId) {
        socketService.disconnect();
        notificationSocketService.disconnect();
        projectSocketService.disconnect();
        void queryClient.cancelQueries();
        queryClient.clear();
        clearCopiedMessage();
        userId = nextUserId;
      }
    });
    return () => {
      unsubscribe();
      clearCopiedMessage();
    };
  }, [queryClient]);

  useEffect(() => {
    const replaceIfNeeded = (targetPath: string) => {
      if (pathname !== targetPath) {
        router.replace(targetPath);
      }
    };

    const initializeAuth = async () => {
      const initialSession = store.getState().auth;
      const currentToken = store.getState().auth.accessToken;
      const currentSearch = getCurrentSearch();
      const safeReturnTo = getReturnToFromSearch(currentSearch);

      // 1. If we have already checked authentication on initial mount, skip refreshApi
      if (hasInitialized.current) {
        if (currentToken) {
          if (shouldRedirectAuthenticatedUser(pathname)) {
            replaceIfNeeded(safeReturnTo ?? "/dashboard");
          }
        } else {
          if (!isPublicPath(pathname)) {
            replaceIfNeeded(getLoginRedirectPath(pathname, currentSearch));
          }
        }
        setIsInitializing(false);
        return;
      }

      // 2. Initial mount check (restore session if refresh cookie exists)
      try {
        const response = await refreshApi();
        const data = response.data;

        if (store.getState().auth !== initialSession) return;

        if (!data || !data.accessToken) {
          throw new Error("Chưa đăng nhập");
        }

        dispatch(
          setCredentials({
            accessToken: data.accessToken,
            userId: data.userId,
            email: data.email,
            role: data.role,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
          }),
        );

        if (shouldRedirectAuthenticatedUser(pathname)) {
          replaceIfNeeded(safeReturnTo ?? "/dashboard");
        }
      } catch (error) {
        if (store.getState().auth !== initialSession) return;
        if (!isAuthenticationFailure(error)) {
          // A temporary refresh outage must not revoke an existing local session
          // or erase the refresh cookie needed to restore it later.
          if (!currentToken && !isPublicPath(pathname)) {
            replaceIfNeeded(getLoginRedirectPath(pathname, currentSearch));
          }
          return;
        }
        await endSession(initialSession);
      } finally {
        hasInitialized.current = true;
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [pathname, router, dispatch]);

  if (isInitializing) {
    return (
      <div role="status" aria-label="Loading your workspace" className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-[var(--color-primary)]"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
