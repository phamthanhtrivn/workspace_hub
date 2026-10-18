"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import InputField from "@/components/common/input-field";
import { OtpInput } from "@/components/common/otp-input";
import {
  useResetPasswordMutation,
  useSendResetOtpMutation,
  useVerifyResetOtpMutation,
} from "../hooks/useForgotPasswordMutations";
import {
  AuthRouteTarget,
  ForgotPasswordStep,
} from "../types/auth.constants";
import {
  getAuthErrorMessage,
  getAuthValidationErrors,
} from "../utils/auth-error";
import { Button } from "@/components/ui/button";


const ForgotPasswordForm = React.memo(function ForgotPasswordForm() {
  const sendResetOtpMutation = useSendResetOtpMutation();
  const verifyResetOtpMutation = useVerifyResetOtpMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const [step, setStep] = useState<ForgotPasswordStep>(
    ForgotPasswordStep.EMAIL,
  );
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isLoading =
    sendResetOtpMutation.isPending ||
    verifyResetOtpMutation.isPending ||
    resetPasswordMutation.isPending;

  const handleApiError = (error: unknown) => {
    const validationErrors = getAuthValidationErrors(error);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    toast.error(
      getAuthErrorMessage(
        error,
        "An error occurred",
      ),
    );
  };

  const handleSendEmail = (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors({});

    sendResetOtpMutation.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success("Verification code sent to your email");
          setStep(ForgotPasswordStep.OTP);
        },
        onError: handleApiError,
      },
    );
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    verifyResetOtpMutation.mutate(
      { email, otp },
      {
        onSuccess: (response) => {
          setResetToken(response.data.resetToken);
          toast.success("Verification code verified successfully");
          setStep(ForgotPasswordStep.PASSWORD);
        },
        onError: handleApiError,
      },
    );
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (newPassword !== confirmPassword) {
      setErrors({
        confirmPassword: "Passwords do not match",
      });
      requestAnimationFrame(() => document.getElementById("confirmPassword")?.focus());
      return;
    }

    resetPasswordMutation.mutate(
      { email, resetToken, newPassword },
      {
        onSuccess: () => {
          toast.success("Password updated successfully");
          window.location.href = AuthRouteTarget.LOGIN;
        },
        onError: handleApiError,
      },
    );
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
  };

  const handleNewPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setNewPassword(e.target.value);
    if (errors.newPassword) {
      setErrors((prev) => ({ ...prev, newPassword: "" }));
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <ol aria-label="Password recovery progress" className="flex flex-wrap gap-3 text-xs text-muted-foreground">{[[ForgotPasswordStep.EMAIL, "Email"], [ForgotPasswordStep.OTP, "Verify code"], [ForgotPasswordStep.PASSWORD, "New password"]].map(([value, label]) => <li key={value} aria-current={step === value ? "step" : undefined} className={step === value ? "font-semibold text-foreground" : undefined}>{label}</li>)}</ol>
      {step !== ForgotPasswordStep.EMAIL && (
        <Button variant="unstyled"
          type="button"
          onClick={() => {
            if (step === ForgotPasswordStep.OTP) {
              setStep(ForgotPasswordStep.EMAIL);
            }
            if (step === ForgotPasswordStep.PASSWORD) {
              setStep(ForgotPasswordStep.OTP);
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      {step === ForgotPasswordStep.EMAIL && (
        <form
          onSubmit={handleSendEmail}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-foreground"
            >
              Email <span className="text-destructive-content">*</span>
            </label>
            <InputField autoComplete="email" required
              variant="auth"
              id="email"
              type="email"
              icon={Mail}
              placeholder="you@workspacehub.vn"
              value={email}
              error={errors.email}
              onChange={handleEmailChange}
            />
          </div>
          <Button variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {sendResetOtpMutation.isPending ? "Sending..." : "Send reset code"}
          </Button>
        </form>
      )}

      {step === ForgotPasswordStep.OTP && (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-link mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Enter verification code
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a verification code to:
                <br />
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <OtpInput error={errors.otp}
                length={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
                }}
              />

            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Didn't receive code?{" "}
              </span>
              <Button variant="unstyled"
                type="button"
                onClick={() => handleSendEmail()}
                className="font-bold text-link transition hover:text-foreground cursor-pointer"
                disabled={isLoading}
              >
                Resend code
              </Button>
            </div>
          </div>
          <Button variant="unstyled"
            type="submit"
            disabled={isLoading || otp.length < 6}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {verifyResetOtpMutation.isPending ? "Verifying..." : "Verify code"}
          </Button>
        </form>
      )}

      {step === ForgotPasswordStep.PASSWORD && (
        <form
          onSubmit={handleResetPassword}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="text-sm font-semibold text-foreground"
            >
              New Password <span className="text-destructive-content">*</span>
            </label>
            <InputField autoComplete="new-password" required
              variant="auth"
              id="newPassword"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              value={newPassword}
              error={errors.newPassword}
              onChange={handleNewPasswordChange}
              rightIcon={
                showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )
              }
              onRightClick={() => setShowPassword((prev) => !prev)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-foreground"
            >
              Confirm Password <span className="text-destructive-content">*</span>
            </label>
            <InputField autoComplete="new-password" required
              variant="auth"
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              value={confirmPassword}
              error={errors.confirmPassword}
              onChange={handleConfirmPasswordChange}
              rightIcon={
                showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )
              }
              onRightClick={() => setShowConfirmPassword((prev) => !prev)}
            />
          </div>
          <Button variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {resetPasswordMutation.isPending ? "Updating..." : "Update password"}
          </Button>
        </form>
      )}

      {step === ForgotPasswordStep.EMAIL && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link
            href={AuthRouteTarget.LOGIN}
            className="font-bold text-link transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring underline"
          >
            Back to Sign In
          </Link>
        </p>
      )}
    </div>
  );
});

export default ForgotPasswordForm;
