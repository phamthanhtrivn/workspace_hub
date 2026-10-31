"use client";

import React, { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { AuthRouteTarget, ForgotPasswordStep } from "../types/auth.constants";
import {
  forgotEmailFormSchema,
  verifyOtpFormSchema,
  resetPasswordFormSchema,
  type ForgotEmailFormValues,
  type VerifyOtpFormValues,
  type ResetPasswordFormValues,
} from "../schemas/auth-form.schemas";
import {
  AUTH_VALIDATION_LIMITS,
  AUTH_VALIDATION_MESSAGES as messages,
} from "../types/auth-validation.constants";
import { useAuthFormSubmit } from "../hooks/use-auth-form-submit";
import { handleAuthFormError } from "../utils/auth-form-error";
import { AuthFormError } from "./auth-form-error";
import { ForgotPasswordProgress } from "./forgot-password-progress";
import { Button } from "@/components/ui/button";

const ForgotPasswordForm = React.memo(function ForgotPasswordForm() {
  const sendResetOtpMutation = useSendResetOtpMutation();
  const verifyResetOtpMutation = useVerifyResetOtpMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const [step, setStep] = useState<ForgotPasswordStep>(
    ForgotPasswordStep.EMAIL,
  );
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const submissionLock = useRef(false);
  const emailForm = useForm<ForgotEmailFormValues>({
    resolver: zodResolver(forgotEmailFormSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const otpForm = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpFormSchema),
    defaultValues: { otp: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const emailErrors = emailForm.formState.errors;
  const otpErrors = otpForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;
  const isLoading =
    sendResetOtpMutation.isPending ||
    verifyResetOtpMutation.isPending ||
    resetPasswordMutation.isPending ||
    emailForm.formState.isSubmitting ||
    otpForm.formState.isSubmitting ||
    passwordForm.formState.isSubmitting;

  const onEmailSubmit = useAuthFormSubmit(
    emailForm,
    ["email"],
    messages.sendCodeFailed,
    async (values) => {
      await sendResetOtpMutation.mutateAsync(values);
      setEmail(values.email);
      otpForm.reset();
      passwordForm.reset();
      setResetToken("");
      toast.success("Verification code sent to your email");
      setStep(ForgotPasswordStep.OTP);
    },
    submissionLock,
  );

  const onOtpSubmit = useAuthFormSubmit(
    otpForm,
    ["otp"],
    messages.verifyCodeFailed,
    async (values) => {
      const response = await verifyResetOtpMutation.mutateAsync({
        email,
        otp: values.otp,
      });
      const token = response.data?.resetToken;
      if (typeof token !== "string" || !token)
        throw new Error(messages.verifyCodeFailed);
      setResetToken(token);
      passwordForm.reset();
      toast.success("Verification code verified successfully");
      setStep(ForgotPasswordStep.PASSWORD);
    },
    submissionLock,
  );

  const onPasswordSubmit = useAuthFormSubmit(
    passwordForm,
    ["newPassword", "confirmPassword"],
    messages.resetFailed,
    async (values) => {
      if (!resetToken) {
        passwordForm.setError("root.server", {
          message: messages.resetExpired,
        });
        return;
      }
      await resetPasswordMutation.mutateAsync({
        email,
        resetToken,
        newPassword: values.newPassword,
      });
      toast.success("Password updated successfully");
      window.location.href = AuthRouteTarget.LOGIN;
    },
    submissionLock,
  );

  const handleResendCode = async () => {
    if (!email || submissionLock.current) return;
    submissionLock.current = true;
    otpForm.clearErrors("root");
    try {
      await sendResetOtpMutation.mutateAsync({ email });
      otpForm.reset();
      passwordForm.reset();
      setResetToken("");
      toast.success("Verification code sent to your email");
    } catch (error) {
      handleAuthFormError(error, otpForm, [], messages.sendCodeFailed);
    } finally {
      submissionLock.current = false;
    }
  };

  const handleBack = () => {
    if (submissionLock.current) return;
    setResetToken("");
    passwordForm.reset();
    if (step === ForgotPasswordStep.PASSWORD) {
      otpForm.clearErrors();
      setStep(ForgotPasswordStep.OTP);
    } else {
      otpForm.reset();
      emailForm.clearErrors();
      setStep(ForgotPasswordStep.EMAIL);
    }
  };

  return (
    <div className="space-y-6">
      <ForgotPasswordProgress step={step} />
      {step !== ForgotPasswordStep.EMAIL && (
        <Button
          variant="unstyled"
          type="button"
          onClick={handleBack}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      {step === ForgotPasswordStep.EMAIL && (
        <form
          noValidate
          onSubmit={onEmailSubmit}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-foreground"
            >
              Email <span className="text-destructive-content">*</span>
            </label>
            <InputField
              autoComplete="email"
              required
              variant="auth"
              className="text-base sm:text-sm"
              id="email"
              type="email"
              icon={Mail}
              placeholder="you@workspacehub.vn"
              {...emailForm.register("email")}
              disabled={isLoading}
              error={emailErrors.email?.message}
            />
          </div>
          <AuthFormError message={emailErrors.root?.server?.message} />
          <Button
            loading={sendResetOtpMutation.isPending}
            variant="unstyled"
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
          noValidate
          onSubmit={onOtpSubmit}
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
              <Controller
                control={otpForm.control}
                name="otp"
                render={({ field, fieldState }) => (
                  <OtpInput
                    length={AUTH_VALIDATION_LIMITS.otpLength}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    disabled={isLoading}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Didn&apos;t receive code?{" "}
              </span>
              <Button
                variant="unstyled"
                type="button"
                onClick={handleResendCode}
                className="font-bold text-link transition hover:text-foreground cursor-pointer"
                disabled={isLoading}
              >
                Resend code
              </Button>
            </div>
          </div>
          <AuthFormError message={otpErrors.root?.server?.message} />
          <Button
            loading={verifyResetOtpMutation.isPending}
            variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {verifyResetOtpMutation.isPending ? "Verifying..." : "Verify code"}
          </Button>
        </form>
      )}

      {step === ForgotPasswordStep.PASSWORD && (
        <form
          noValidate
          onSubmit={onPasswordSubmit}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="text-sm font-semibold text-foreground"
            >
              New Password <span className="text-destructive-content">*</span>
            </label>
            <InputField
              autoComplete="new-password"
              required
              variant="auth"
              className="text-base sm:text-sm"
              id="newPassword"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              {...passwordForm.register("newPassword", {
                deps: ["confirmPassword"],
              })}
              disabled={isLoading}
              error={passwordErrors.newPassword?.message}
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
              Confirm Password{" "}
              <span className="text-destructive-content">*</span>
            </label>
            <InputField
              autoComplete="new-password"
              required
              variant="auth"
              className="text-base sm:text-sm"
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              {...passwordForm.register("confirmPassword")}
              disabled={isLoading}
              error={passwordErrors.confirmPassword?.message}
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
          <AuthFormError message={passwordErrors.root?.server?.message} />
          <Button
            loading={resetPasswordMutation.isPending}
            variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {resetPasswordMutation.isPending
              ? "Updating..."
              : "Update password"}
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
