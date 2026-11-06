"use client";

import { Controller } from "react-hook-form";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import InputField from "@/components/common/input-field";
import { OtpInput } from "@/components/common/otp-input";
import { Button } from "@/components/ui/button";
import { AuthLink as Link } from "./auth-link";
import { AuthFormError } from "./auth-form-error";
import { AuthFormStatus } from "./auth-form-status";
import { EmailVerificationProgress } from "./email-verification-progress";
import { useEmailVerificationFlow } from "../hooks/use-email-verification-flow";
import { AUTH_ACTION, AUTH_ACTIVITY_COPY, AUTH_REDIRECT_BUTTON } from "../types/auth-activity.constants";
import { EMAIL_VERIFICATION_STEP } from "../types/email-verification.constants";
import { AUTH_VALIDATION_LIMITS } from "../types/auth-validation.constants";

export function EmailVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const flow = useEmailVerificationFlow(initialEmail);
  const { step, busy, sendingCode, verifyingEmail, activity, emailForm, otpForm } = flow;
  const emailErrors = emailForm.formState.errors;
  const otpErrors = otpForm.formState.errors;

  return (
    <div className="space-y-6">
      <EmailVerificationProgress step={step} />
      <AuthFormStatus />
      {step === EMAIL_VERIFICATION_STEP.EMAIL ? (
        <form noValidate onSubmit={flow.onEmailSubmit} aria-busy={busy} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="verification-email" className="text-sm font-semibold text-foreground">
              Email <span className="text-destructive-content">*</span>
            </label>
            <InputField
              id="verification-email" type="email" autoComplete="email" required
              variant="auth" className="text-base sm:text-sm" icon={Mail}
              placeholder="you@workspacehub.vn" maxLength={AUTH_VALIDATION_LIMITS.emailLength}
              {...emailForm.register("email")} disabled={busy} error={emailErrors.email?.message}
            />
          </div>
          <AuthFormError message={emailErrors.root?.server?.message || flow.deliveryError} />
          <Button
            type="submit" variant="unstyled" loading={sendingCode} disabled={busy || flow.emailCooldown > 0}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            <Mail className="size-4" />
            {sendingCode ? AUTH_ACTIVITY_COPY[AUTH_ACTION.SEND_VERIFICATION_CODE].button
              : flow.emailCooldown > 0 ? `Send again in ${flow.emailCooldown}s` : "Send verification code"}
          </Button>
        </form>
      ) : (
        <>
          <Button type="button" variant="unstyled" onClick={flow.changeEmail} disabled={busy}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> Change email
          </Button>
          <form noValidate onSubmit={flow.onCodeSubmit} aria-busy={busy} className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-link">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Enter verification code</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Check your inbox and spam folder for the code for:<br />
                  <span className="break-words font-semibold text-foreground">{flow.email}</span>
                </p>
              </div>
              <Controller control={otpForm.control} name="otp" render={({ field, fieldState }) => (
                <OtpInput
                  length={AUTH_VALIDATION_LIMITS.otpLength} value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} disabled={busy} error={fieldState.error?.message}
                />
              )} />
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Didn&apos;t receive a code? </span>
                <Button type="button" variant="unstyled" onClick={flow.resendCode} loading={sendingCode}
                  disabled={busy || flow.cooldown > 0}
                  className="font-bold text-link transition hover:text-foreground disabled:opacity-50">
                  {sendingCode ? AUTH_ACTIVITY_COPY[AUTH_ACTION.SEND_VERIFICATION_CODE].button
                    : flow.cooldown > 0 ? `Resend in ${flow.cooldown}s` : "Resend code"}
                </Button>
              </div>
            </div>
            <AuthFormError message={otpErrors.root?.server?.message} />
            <Button
              type="submit" variant="unstyled" loading={verifyingEmail} disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              <ShieldCheck className="size-4" />
              {verifyingEmail ? activity?.phase === "redirecting" ? AUTH_REDIRECT_BUTTON : AUTH_ACTIVITY_COPY[AUTH_ACTION.VERIFY_EMAIL].button : "Verify email"}
            </Button>
          </form>
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Need to recover your account?{" "}
        <Link href="/forgot-password" className="font-bold text-link underline transition hover:text-foreground">
          Reset password
        </Link>
      </p>
    </div>
  );
}
