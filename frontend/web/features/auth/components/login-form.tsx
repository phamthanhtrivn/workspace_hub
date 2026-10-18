"use client";

import React, { useCallback, useState } from "react";
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
  getAuthErrorMessage,
  getAuthValidationErrors,
} from "../utils/auth-error";
import {
  getAuthenticatedHomePath,
  getReturnToFromSearch,
} from "../utils/auth-redirect";

const LoginForm = React.memo(function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const loginMutation = useLoginMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [id]: "",
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    loginMutation.mutate(
      {
        email: formData.email,
        password: formData.password,
      },
      {
        onSuccess: (response) => {
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
        onError: (error) => {
          const validationErrors = getAuthValidationErrors(error);
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }

          toast.error(
            getAuthErrorMessage(
              error,
              "Login failed",
            ),
          );
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          variant="auth"
          id="email"
          type="email"
          icon={Mail}
          placeholder="you@workspacehub.vn"
          value={formData.email}
          error={errors.email}
          onChange={handleChange}
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
          variant="auth"
          id="password"
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder="••••••••"
          value={formData.password}
          error={errors.password}
          onChange={handleChange}
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

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_16px_32px_color-mix(in_srgb,var(--primary)_22%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring cursor-pointer disabled:opacity-70"
      >
        <LogIn className="h-4 w-4" />
        {loginMutation.isPending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
});

export default LoginForm;
