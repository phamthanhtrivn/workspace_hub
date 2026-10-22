"use client";

import React from "react";
import { Lock } from "lucide-react";
import { getLoginRedirectPath } from "@/features/auth/utils/auth-redirect";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function SharedDenied() {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-dialog border border-border p-8 text-center flex flex-col items-center justify-center">
        <div className="bg-destructive-soft p-4 rounded-full text-destructive-content mb-4">
          <Lock size={36} />
        </div>
        <h2 className="text-section-title font-semibold text-foreground">Access unavailable</h2>
        <p className="text-sm text-muted-foreground font-semibold mt-2 leading-relaxed">
          You do not have access to this document, or the shared link has expired.
        </p>
        <div className="flex flex-col gap-2 w-full mt-6">
          <Link
            href={getLoginRedirectPath(pathname)}
            className="flex items-center justify-center w-full rounded-panel bg-primary hover:bg-primary text-primary-foreground py-3 text-xs font-semibold transition-all cursor-pointer"
          >
            Sign in to check access
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center w-full rounded-panel bg-background hover:bg-muted text-muted-foreground border border-border py-3 text-xs font-semibold transition-all cursor-pointer"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
