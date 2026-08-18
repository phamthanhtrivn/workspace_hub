"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import InputField from "@/components/common/input-field";
import { useRegisterMutation } from "../hooks/useAuthMutations";
import { AuthRouteTarget } from "../types/auth.constants";
import {
  getAuthErrorMessage,
  getAuthValidationErrors,
} from "../utils/auth-error";

const RegisterForm = React.memo(function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    if (formData.password !== formData.confirmPassword) {
      setErrors({
        confirmPassword: "Password confirmation does not match",
      });
      return;
    }

    setErrors({});
    registerMutation.mutate(
      {
        fullName: formData.fullName,
        dob: formData.dob,
        email: formData.email,
        password: formData.password,
      },
      {
        onSuccess: (response) => {
          toast.success(response.message);
          router.replace(AuthRouteTarget.LOGIN);

          setFormData({
            fullName: "",
            dob: "",
            email: "",
            password: "",
            confirmPassword: "",
          });
        },
        onError: (error) => {
          const validationErrors = getAuthValidationErrors(error);
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }

          toast.error(getAuthErrorMessage(error, "Registration failed"));
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Full name <span className="text-red-500">*</span>
          </label>

          <InputField
            id="fullName"
            type="text"
            icon={User}
            placeholder="John Doe"
            value={formData.fullName}
            error={errors.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Date of birth <span className="text-red-500">*</span>
          </label>

          <InputField
            id="dob"
            type="date"
            icon={Calendar}
            placeholder=""
            value={formData.dob}
            error={errors.dob}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          Email <span className="text-red-500">*</span>
        </label>

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
        <label className="text-sm font-semibold text-slate-700">
          Password <span className="text-red-500">*</span>
        </label>

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

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          Confirm password <span className="text-red-500">*</span>
        </label>

        <InputField
          id="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          icon={Lock}
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          error={errors.confirmPassword}
          onChange={handleChange}
          rightIcon={
            showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )
          }
          onRightClick={() => setShowConfirmPassword((prev) => !prev)}
        />
      </div>

      <button
        type="submit"
        disabled={registerMutation.isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] disabled:opacity-70"
      >
        <UserPlus className="h-4 w-4" />
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
});

export default RegisterForm;
