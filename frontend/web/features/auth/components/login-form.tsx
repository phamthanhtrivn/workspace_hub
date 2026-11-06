"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLink as Link } from "@/features/auth/components/auth-link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import InputField from "@/components/common/input-field";
import { cn } from "@/lib/utils";
import { setCredentials } from "@/store/auth/auth-slice";
import type { AppDispatch } from "@/store/store";
import { useLoginMutation } from "../hooks/useAuthMutations";
import {
  loginFormSchema,
  type LoginFormValues,
} from "../schemas/auth-form.schemas";
import { AUTH_VALIDATION_MESSAGES } from "../types/auth-validation.constants";
import { useAuthFormSubmit } from "../hooks/use-auth-form-submit";
import { AuthFormError } from "./auth-form-error";
import {
  getAuthenticatedHomePath,
  getReturnToFromSearch,
} from "../utils/auth-redirect";
import { Button } from "@/components/ui/button";
import { AUTH_ACTION, AUTH_ACTIVITY_COPY, AUTH_REDIRECT_COPY, AUTH_REDIRECT_BUTTON } from "../types/auth-activity.constants";
import { useAuthInteraction } from "./auth-interaction-provider";
import { AuthFormStatus } from "./auth-form-status";
import { isEmailVerificationRequired } from "../utils/auth-error";
import { EMAIL_VERIFICATION } from "../types/email-verification.constants";
import { EmailVerificationNotice } from "./email-verification-notice";

const LoginForm = React.memo(function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    shouldFocusError: false,
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { errors } = form.formState;
  const { busy, activity, redirect } = useAuthInteraction();
  const loginBusy = busy && activity?.action === AUTH_ACTION.LOGIN;
  const verificationRequired = verificationEmail !== null && activity?.action !== AUTH_ACTION.GOOGLE;
  const serverError = activity?.action === AUTH_ACTION.GOOGLE ? undefined : errors.root?.server?.message;
  const onSubmit = useAuthFormSubmit(
    form,
    ["email", "password"],
    AUTH_VALIDATION_MESSAGES.loginFailed,
    async (values) => {
      setVerificationEmail(null);
      const response = await loginMutation.mutateAsync(values).catch((error: unknown) => {
        if (isEmailVerificationRequired(error)) setVerificationEmail(values.email);
        throw error;
      });
      const data = response.data;
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          userId: data.userId,
          email: data.email,
          role: data.role,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
        }),
      );
      redirect(AUTH_ACTION.LOGIN, AUTH_REDIRECT_COPY.workspace);
      toast.success(response.message);
      router.replace(
        getReturnToFromSearch(window.location.search) ??
          getAuthenticatedHomePath(data.role),
      );
    },
    AUTH_ACTION.LOGIN,
  );

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={busy} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-foreground"
          >
            Email <span className="text-destructive-content">*</span>
          </label>
        </div>

        <InputField
          autoComplete="email"
          required
          variant="auth"
          className="text-base sm:text-sm"
          id="email"
          type="email"
          icon={Mail}
          placeholder="you@workspacehub.vn"
          {...form.register("email", { onChange: () => setVerificationEmail(null) })}
          disabled={busy}
          error={errors.email?.message}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-foreground"
          >
            Password <span className="text-destructive-content">*</span>
          </label>
          <div>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-link hover:text-foreground transition"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <InputField
          autoComplete="current-password"
          required
          variant="auth"
          className="text-base sm:text-sm"
          id="password"
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder="••••••••"
          {...form.register("password")}
          disabled={busy}
          error={errors.password?.message}
          rightIcon={
            showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )
          }
          onRightClick={() => setShowPassword((prev) => !prev)}
        />
      </div>

      <AuthFormError message={verificationRequired && serverError === EMAIL_VERIFICATION.requiredMessage ? undefined : serverError} />
      {verificationRequired && !busy && verificationEmail && (
        <EmailVerificationNotice email={verificationEmail} />
      )}
      <AuthFormStatus excludeAction={AUTH_ACTION.GOOGLE} />
      <Button
        loading={loginBusy}
        variant={verificationRequired ? "outline" : "unstyled"}
        type="submit"
        disabled={busy}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring cursor-pointer disabled:opacity-70",
          !verificationRequired && "bg-primary text-primary-foreground shadow-[0_16px_32px_color-mix(in_srgb,var(--primary)_22%,transparent)] hover:-translate-y-0.5 hover:bg-primary active:translate-y-0",
        )}
      >
        <LogIn className="h-4 w-4" />
        {loginBusy ? activity.phase === "redirecting" ? AUTH_REDIRECT_BUTTON : AUTH_ACTIVITY_COPY.login.button : "Login"}
      </Button>
    </form>
  );
});

export default LoginForm;
