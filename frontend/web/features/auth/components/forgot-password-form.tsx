"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { toast } from "react-toastify";
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
      return;
    }

    toast.error(
      getAuthErrorMessage(error, "Something went wrong. Please try again."),
    );
  };

  const handleSendEmail = (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors({});

    sendResetOtpMutation.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success("A verification code has been sent to your email.");
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
          toast.success("Verification successful.");
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
      setErrors({ confirmPassword: "Password confirmation does not match" });
      return;
    }

    resetPasswordMutation.mutate(
      { email, resetToken, newPassword },
      {
        onSuccess: () => {
          toast.success("Password updated successfully.");
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
      {step !== ForgotPasswordStep.EMAIL && (
        <button
          type="button"
          onClick={() => {
            if (step === ForgotPasswordStep.OTP) {
              setStep(ForgotPasswordStep.EMAIL);
            }
            if (step === ForgotPasswordStep.PASSWORD) {
              setStep(ForgotPasswordStep.OTP);
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {step === ForgotPasswordStep.EMAIL && (
        <form
          onSubmit={handleSendEmail}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <InputField
              id="email"
              type="email"
              icon={Mail}
              placeholder="Enter your email"
              value={email}
              error={errors.email}
              onChange={handleEmailChange}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {sendResetOtpMutation.isPending ? "Sending..." : "Send reset code"}
          </button>
        </form>
      )}

      {step === ForgotPasswordStep.OTP && (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Enter verification code
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                The 6-digit code was sent to
                <br />
                <span className="font-semibold text-slate-800">{email}</span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <OtpInput
                length={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
                }}
              />
              {errors.otp && (
                <p className="text-xs text-red-500 mt-2">{errors.otp}</p>
              )}
            </div>

            <div className="text-center text-sm">
              <span className="text-slate-500">
                Did not receive the code?{" "}
              </span>
              <button
                type="button"
                onClick={() => handleSendEmail()}
                className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] cursor-pointer"
                disabled={isLoading}
              >
                Resend
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || otp.length < 6}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {verifyResetOtpMutation.isPending ? "Verifying..." : "Verify"}
          </button>
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
              className="text-sm font-semibold text-slate-700"
            >
              New password <span className="text-red-500">*</span>
            </label>
            <InputField
              id="newPassword"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="Enter a new password"
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
              className="text-sm font-semibold text-slate-700"
            >
              Confirm password <span className="text-red-500">*</span>
            </label>
            <InputField
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              icon={Lock}
              placeholder="Re-enter your new password"
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
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {resetPasswordMutation.isPending ? "Updating..." : "Update password"}
          </button>
        </form>
      )}

      {step === ForgotPasswordStep.EMAIL && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Remembered your password?{" "}
          <Link
            href={AuthRouteTarget.LOGIN}
            className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] underline"
          >
            Back to sign in
          </Link>
        </p>
      )}
    </div>
  );
});

export default ForgotPasswordForm;
