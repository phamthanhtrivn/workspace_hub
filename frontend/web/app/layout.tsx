import { createRootMetadata } from "@/lib/seo";
import "@fontsource-variable/inter";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

export const metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen">
        <AppProviders
          googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
