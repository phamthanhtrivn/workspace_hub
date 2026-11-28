"use client";

import React from "react";
import { Lock } from "lucide-react";
import { getLoginRedirectPath } from "@/features/auth/utils/auth-redirect";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SHARED_DOCUMENT_ACCESS_CODE,
  type SharedDocumentAccessCode,
} from "@/features/documents/types/shared-document-access.constants";

const ACCESS_MESSAGES: Record<
  SharedDocumentAccessCode,
  { title: string; description: string; guidance: string }
> = {
  [SHARED_DOCUMENT_ACCESS_CODE.RESTRICTED]: {
    title: "Access restricted",
    description:
      "This document or folder is restricted. Only people with permission can open it.",
    guidance: "Ask the owner to share it with your account.",
  },
  [SHARED_DOCUMENT_ACCESS_CODE.EXPIRED]: {
    title: "Link expired",
    description: "Public access through this sharing link has expired.",
    guidance:
      "Ask the owner to renew the link or share the document with your account.",
  },
  [SHARED_DOCUMENT_ACCESS_CODE.NOT_FOUND]: {
    title: "Document not found",
    description:
      "This document or folder no longer exists, or the link is incorrect.",
    guidance: "Check the link with the person who shared it.",
  },
  [SHARED_DOCUMENT_ACCESS_CODE.UNAVAILABLE]: {
    title: "Document unavailable",
    description: "This document or folder is no longer available.",
    guidance: "Contact the owner to check whether it can be shared again.",
  },
};

export function SharedDenied({
  reason,
  isLoggedIn,
}: {
  reason: SharedDocumentAccessCode;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();
  const content = ACCESS_MESSAGES[reason];
  const canSignIn =
    !isLoggedIn && reason !== SHARED_DOCUMENT_ACCESS_CODE.NOT_FOUND;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-dialog border border-border p-8 text-center flex flex-col items-center justify-center">
        <div className="bg-warning-soft p-4 rounded-full text-warning-content mb-4">
          <Lock size={36} />
        </div>
        <h2 className="text-section-title font-semibold text-foreground">
          {content.title}
        </h2>
        <p className="text-sm text-muted-foreground font-semibold mt-2 leading-relaxed">
          {content.description}
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {content.guidance}
        </p>
        {canSignIn && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            If you already have access, sign in with the account the owner
            shared it with.
          </p>
        )}
        <div className="flex flex-col gap-2 w-full mt-6">
          {canSignIn && (
            <Link
              href={getLoginRedirectPath(pathname)}
              className="flex items-center justify-center w-full rounded-panel bg-primary hover:bg-primary text-primary-foreground py-3 text-xs font-semibold transition-all cursor-pointer"
            >
              Sign in to check access
            </Link>
          )}
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
