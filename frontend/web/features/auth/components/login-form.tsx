"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import InputField from "@/components/common/input-field";
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

const LoginForm = React.memo(function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { errors, isSubmitting } = form.formState;
  const busy = isSubmitting || loginMutation.isPending;
  const onSubmit = useAuthFormSubmit(
    form,
    ["email", "password"],
    AUTH_VALIDATION_MESSAGES.loginFailed,
    async (values) => {
      const response = await loginMutation.mutateAsync(values);
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
      toast.success(response.message);
      router.replace(
        getReturnToFromSearch(window.location.search) ??
          getAuthenticatedHomePath(data.role),
      );
    },
  );

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
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
          {...form.register("email")}
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

      <AuthFormError message={errors.root?.server?.message} />
      <Button
        loading={busy}
        variant="unstyled"
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_16px_32px_color-mix(in_srgb,var(--primary)_22%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring cursor-pointer disabled:opacity-70"
      >
        <LogIn className="h-4 w-4" />
        {busy ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
});

export default LoginForm;
