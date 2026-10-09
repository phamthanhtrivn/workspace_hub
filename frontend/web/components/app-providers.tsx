"use client";

import { usePathname } from "next/navigation";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";
import StoreProvider from "@/store/store-provider";
import QueryProvider from "@/store/query-provider";
import NotificationManagers from "@/features/notification/components/notification-managers";

export function AppProviders({
  children,
  googleClientId,
}: {
  children: React.ReactNode;
  googleClientId: string;
}) {
  const pathname = usePathname();
  // Egress authenticates with its room token and must render only meeting media.
  if (pathname === "/recording-template") return <>{children}</>;
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryProvider>
        <StoreProvider>
          {children}
          <NotificationManagers />
        </StoreProvider>
      </QueryProvider>
      <Toaster richColors position="top-right" />
    </GoogleOAuthProvider>
  );
}
