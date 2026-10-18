import { createRootMetadata } from "@/lib/seo";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider, ThemeToaster } from "@/components/common/theme-provider";
import StoreProvider from "@/store/store-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import QueryProvider from "@/store/query-provider";
import NotificationManagers from "@/features/notification/components/notification-managers";
import { AccountThemeSync } from "@/features/user-setting/components/account-theme-sync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <GoogleOAuthProvider
            clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
          >
            <QueryProvider>
              <StoreProvider>
                <AccountThemeSync />
                {children}
                <NotificationManagers />
              </StoreProvider>
            </QueryProvider>
          </GoogleOAuthProvider>
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

