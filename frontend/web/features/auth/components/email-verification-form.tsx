"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export function EmailVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const send = useSendEmailVerificationMutation();
  const confirm = useConfirmEmailMutation();
  const busy = send.isPending || confirm.isPending;
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          const response = await confirm.mutateAsync({ email, otp });
          toast.success(response.message);
          router.replace("/login");
        } catch (failure) {
          setError(getAuthErrorMessage(failure, "Could not verify email."));
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
          id="verification-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setOtp("");
          }}
          disabled={busy}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy || !email || cooldown > 0}
        onClick={async () => {
          setError("");
          try {
            const response = await send.mutateAsync(email);
            toast.success(response.message);
            setCooldown(EMAIL_VERIFICATION.resendDelaySeconds);
          } catch (failure) {
            setError(
              getAuthErrorMessage(failure, "Could not send verification code."),
            );
          }
        }}
      >
        {cooldown ? `Send again in ${cooldown}s` : "Send verification code"}
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
      {error && (
        <p role="alert" className="text-sm text-destructive-content">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={busy || otp.length !== 6}
      >
        Verify email
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
