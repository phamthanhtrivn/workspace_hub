import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkspaceHub",
  description:
    "Smart platform for tasks management, files management, learning, scheduling, collaboration and productivity with AI assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
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
