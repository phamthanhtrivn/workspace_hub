"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { toast } from "react-toastify";
import InputField from "@/components/common/input-field";
import { setCredentials } from "@/store/auth/auth-slice";
import type { AppDispatch } from "@/store/store";
import { useLoginMutation } from "../hooks/useAuthMutations";
import { AuthRouteTarget, USER_ROLES } from "../types/auth.constants";
import {
  getAuthErrorMessage,
  getAuthValidationErrors,
} from "../utils/auth-error";

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
            data.role === USER_ROLES.ADMIN
              ? AuthRouteTarget.ADMIN_HOME
              : AuthRouteTarget.USER_DASHBOARD,
          );
        },
        onError: (error) => {
          const validationErrors = getAuthValidationErrors(error);
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }

          toast.error(getAuthErrorMessage(error, "Login failed"));
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
            className="text-sm font-semibold text-slate-700"
          >
            Email <span className="text-red-500">*</span>
          </label>
        </div>

        <InputField
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
            className="text-sm font-semibold text-slate-700"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <div>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <InputField
          id="password"
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder="Enter your password"
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
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/25 cursor-pointer disabled:opacity-70"
      >
        <LogIn className="h-4 w-4" />
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
});

export default LoginForm;
