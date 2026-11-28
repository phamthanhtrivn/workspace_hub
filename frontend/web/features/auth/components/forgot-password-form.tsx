"use client";

import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLink as Link } from "@/features/auth/components/auth-link";
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
import { AUTH_ACTION, AUTH_ACTIVITY_COPY, AUTH_REDIRECT_COPY, AUTH_REDIRECT_BUTTON } from "../types/auth-activity.constants";
import { useAuthInteraction } from "./auth-interaction-provider";
import { AuthFormStatus } from "./auth-form-status";

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
  const { busy: isLoading, activity, isLocked, begin, complete, fail, redirect, clear } = useAuthInteraction();
  const sendingCode = isLoading && activity?.action === AUTH_ACTION.SEND_RESET_CODE;
  const verifyingCode = isLoading && activity?.action === AUTH_ACTION.VERIFY_RESET_CODE;
  const resettingPassword = isLoading && activity?.action === AUTH_ACTION.RESET_PASSWORD;
  const emailForm = useForm<ForgotEmailFormValues>({
    shouldFocusError: false,
    resolver: zodResolver(forgotEmailFormSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const otpForm = useForm<VerifyOtpFormValues>({
    shouldFocusError: false,
    resolver: zodResolver(verifyOtpFormSchema),
    defaultValues: { otp: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const passwordForm = useForm<ResetPasswordFormValues>({
    shouldFocusError: false,
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const emailErrors = emailForm.formState.errors;
  const otpErrors = otpForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

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
    AUTH_ACTION.SEND_RESET_CODE,
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
    AUTH_ACTION.VERIFY_RESET_CODE,
  );

  const onPasswordSubmit = useAuthFormSubmit(
    passwordForm,
    ["newPassword", "confirmPassword"],
    messages.resetFailed,
    async (values) => {
      if (!resetToken) {
        fail(AUTH_ACTION.RESET_PASSWORD);
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
      redirect(AUTH_ACTION.RESET_PASSWORD, AUTH_REDIRECT_COPY.passwordReset);
      window.location.href = AuthRouteTarget.LOGIN;
    },
    AUTH_ACTION.RESET_PASSWORD,
  );

  const handleResendCode = async () => {
    if (!email || !begin(AUTH_ACTION.SEND_RESET_CODE)) return;
    otpForm.clearErrors("root");
    try {
      await sendResetOtpMutation.mutateAsync({ email });
      otpForm.reset();
      passwordForm.reset();
      setResetToken("");
      toast.success("Verification code sent to your email");
      complete(AUTH_ACTION.SEND_RESET_CODE);
    } catch (error) {
      fail(AUTH_ACTION.SEND_RESET_CODE);
      handleAuthFormError(error, otpForm, [], messages.sendCodeFailed);
    }
  };

  const handleBack = () => {
    if (isLocked()) return;
    clear();
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
      <AuthFormStatus />
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
          aria-busy={isLoading}
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
            loading={sendingCode}
            variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {sendingCode ? AUTH_ACTIVITY_COPY[AUTH_ACTION.SEND_RESET_CODE].button : "Send reset code"}
          </Button>
        </form>
      )}

      {step === ForgotPasswordStep.OTP && (
        <form
          noValidate
          onSubmit={onOtpSubmit}
          aria-busy={isLoading}
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
                loading={sendingCode}
                className="font-bold text-link transition hover:text-foreground cursor-pointer"
                disabled={isLoading}
              >
                {sendingCode ? AUTH_ACTIVITY_COPY[AUTH_ACTION.SEND_RESET_CODE].button : "Resend code"}
              </Button>
            </div>
          </div>
          <AuthFormError message={otpErrors.root?.server?.message} />
          <Button
            loading={verifyingCode}
            variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {verifyingCode ? AUTH_ACTIVITY_COPY[AUTH_ACTION.VERIFY_RESET_CODE].button : "Verify code"}
          </Button>
        </form>
      )}

      {step === ForgotPasswordStep.PASSWORD && (
        <form
          noValidate
          onSubmit={onPasswordSubmit}
          aria-busy={isLoading}
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
            loading={resettingPassword}
            variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {resettingPassword
              ? activity.phase === "redirecting" ? AUTH_REDIRECT_BUTTON : AUTH_ACTIVITY_COPY[AUTH_ACTION.RESET_PASSWORD].button
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
