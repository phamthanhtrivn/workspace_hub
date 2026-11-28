"use client";

import { useId } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmailVerificationPath } from "../utils/email-verification";
import { AuthLink } from "./auth-link";

export function EmailVerificationNotice({ email }: { email: string }) {
  const descriptionId = useId();

  return (
    <div role="alert" className="space-y-4 rounded-2xl border border-info-outline bg-info-soft p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-info-content">Email verification required</h3>
        <p id={descriptionId} className="text-sm leading-6 text-info-content">
          Confirm your email address to activate your account, then return here to sign in.
        </p>
      </div>
      <Button asChild className="h-12 w-full gap-2 whitespace-normal rounded-2xl px-4 text-center text-sm font-bold">
        <AuthLink href={getEmailVerificationPath(email)} aria-describedby={descriptionId}>
          <MailCheck className="size-4 shrink-0" aria-hidden="true" />
          Verify email to sign in
        </AuthLink>
      </Button>
    </div>
  );
}
