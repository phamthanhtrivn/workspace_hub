"use client";

import { useEffect, useRef, useState } from "react";
import { AuthLink as Link } from "@/features/auth/components/auth-link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import InputField from "@/components/common/input-field";
import { Button } from "@/components/ui/button";
import {
  useConfirmEmailMutation,
  useSendEmailVerificationMutation,
} from "../hooks/useAuthMutations";
import { getAuthErrorMessage } from "../utils/auth-error";
import { EMAIL_VERIFICATION } from "../types/email-verification.constants";
import { AUTH_ACTION, AUTH_ACTIVITY_COPY, AUTH_REDIRECT_COPY, AUTH_REDIRECT_BUTTON } from "../types/auth-activity.constants";
import { useAuthInteraction } from "./auth-interaction-provider";
import { AuthFormStatus } from "./auth-form-status";
import { AuthFormError } from "./auth-form-error";

export function EmailVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const emailInput = useRef<HTMLInputElement>(null);
  const send = useSendEmailVerificationMutation();
  const confirm = useConfirmEmailMutation();
  const { busy, activity, begin, complete, fail, redirect, clear } = useAuthInteraction();
  const sendingCode = busy && activity?.action === AUTH_ACTION.SEND_VERIFICATION_CODE;
  const verifyingEmail = busy && activity?.action === AUTH_ACTION.VERIFY_EMAIL;
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <form
      className="space-y-5"
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity() || !begin(AUTH_ACTION.VERIFY_EMAIL)) return;
        setError("");
        try {
          const response = await confirm.mutateAsync({ email: email.trim(), otp });
          toast.success(response.message);
          redirect(AUTH_ACTION.VERIFY_EMAIL, AUTH_REDIRECT_COPY.emailVerified);
          router.replace("/login");
        } catch (failure) {
          fail(AUTH_ACTION.VERIFY_EMAIL);
          const message = getAuthErrorMessage(failure, "Could not verify email.");
          setError(message);
          toast.error(message);
        }
      }}
    >
      <p className="text-sm text-muted-foreground">
        Verify your email before using your workspace. Enter your address and
        request a code.
      </p>
      <div className="space-y-2">
        <label htmlFor="verification-email" className="text-sm font-semibold">
          Email
        </label>
        <InputField
          ref={emailInput}
          id="verification-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setOtp("");
            setCooldown(0);
            setError("");
            clear();
          }}
          disabled={busy}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        loading={sendingCode}
        disabled={busy || !email || cooldown > 0}
        onClick={async () => {
          if (!emailInput.current?.reportValidity() || !begin(AUTH_ACTION.SEND_VERIFICATION_CODE)) return;
          setError("");
          try {
            const response = await send.mutateAsync(email.trim());
            toast.success(response.message);
            setCooldown(EMAIL_VERIFICATION.resendDelaySeconds);
            complete(AUTH_ACTION.SEND_VERIFICATION_CODE);
          } catch (failure) {
            fail(AUTH_ACTION.SEND_VERIFICATION_CODE);
            const message = getAuthErrorMessage(failure, "Could not send verification code.");
            setError(message);
            toast.error(message);
          }
        }}
      >
        {sendingCode ? AUTH_ACTIVITY_COPY[AUTH_ACTION.SEND_VERIFICATION_CODE].button
          : cooldown ? `Send again in ${cooldown}s` : "Send verification code"}
      </Button>
      <div className="space-y-2">
        <label htmlFor="verification-code" className="text-sm font-semibold">
          Verification code
        </label>
        <InputField
          id="verification-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          required
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          disabled={busy}
        />
      </div>
      <AuthFormError message={error} />
      <AuthFormStatus />
      <Button
        type="submit"
        loading={verifyingEmail}
        className="w-full"
        disabled={busy || otp.length !== 6}
      >
        {verifyingEmail ? activity.phase === "redirecting" ? AUTH_REDIRECT_BUTTON : AUTH_ACTIVITY_COPY[AUTH_ACTION.VERIFY_EMAIL].button : "Verify email"}
      </Button>
      <Link href="/login" className="block text-center text-sm text-link">
        Back to sign in
      </Link>
      <Link
        href="/forgot-password"
        className="block text-center text-sm text-link"
      >
        Need to recover your account?
      </Link>
    </form>
  );
}
