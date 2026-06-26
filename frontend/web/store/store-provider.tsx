"use client";

import { Provider } from "react-redux";
import { store, useAppDispatch } from "./store";
import { setCredentials, clearCredentials } from "./auth/auth-slice";
import "@/lib/interceptors";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshApi } from "@/features/auth/api/auth.api";
import axios from "axios";

const PUBLIC_PATHS = ["/login", "/register", "/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
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
          }),
        );

        if (pathname === "/login" || pathname === "/register") {
          router.replace("/dashboard");
        }
      } catch (error) {
        dispatch(clearCredentials());

        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
            {},
            { withCredentials: true },
          );
        } catch (e) {
          // Ignore logout error
        }

        if (!isPublicPath(pathname)) {
          router.replace(`/login`);
        }
      } finally {
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
