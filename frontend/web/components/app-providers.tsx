"use client";

import { usePathname } from "next/navigation";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  ThemeProvider,
  ThemeToaster,
} from "@/components/common/theme-provider";
import { AccountThemeSync } from "@/features/user-setting/components/account-theme-sync";
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
    <ThemeProvider>
      <GoogleOAuthProvider clientId={googleClientId} locale="en">
        <QueryProvider>
          <StoreProvider>
            <AccountThemeSync />
            {children}
            <NotificationManagers />
          </StoreProvider>
        </QueryProvider>
        <ThemeToaster />
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
