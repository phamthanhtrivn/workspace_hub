"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import "@/lib/interceptors";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { checkSessionApi } from "@/features/auth/api/auth.api";

const PUBLIC_PATHS = ["/login", "/register", "/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await checkSessionApi();
        if (!response?.authenticated && !isPublicPath(pathname)) {
          router.replace(`/login`);
        }
      } catch (error) {
        if (!isPublicPath(pathname)) {
          router.replace(`/login`);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    verifySession();
  }, [pathname, router]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải...
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
