import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import StoreProvider from "@/store/store-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import QueryProvider from "@/store/query-provider";

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
    <html lang="vi" className="font-sans">
      <body className="min-h-screen">
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        >
          <QueryProvider>
            <StoreProvider>{children}</StoreProvider>
          </QueryProvider>
        </GoogleOAuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
        />
      </body>
    </html>
  );
}
