"use client";

import { Provider } from "react-redux";
import { store, useAppDispatch } from "./store";
import { setCredentials, clearCredentials } from "./auth/auth-slice";
import "@/lib/interceptors";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshApi } from "@/features/auth/api/auth.api";
import axios from "axios";
import {
  getLoginRedirectPath,
  getReturnToFromSearch,
} from "@/features/auth/utils/auth-redirect";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
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
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const replaceIfNeeded = (targetPath: string) => {
      if (pathname !== targetPath) {
        router.replace(targetPath);
      }
    };

    const initializeAuth = async () => {
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
      } catch {
        dispatch(clearCredentials());

        if (!isPublicPath(pathname)) {
          try {
            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
              {},
              { withCredentials: true },
            );
          } catch {
            // Ignore logout error
          }

          replaceIfNeeded(getLoginRedirectPath(pathname, currentSearch));
        }
      } finally {
        hasInitialized.current = true;
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [pathname, router, dispatch]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f9fb]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--color-primary)]"></div>
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
