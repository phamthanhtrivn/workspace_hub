"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";


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
        confirmPassword: "Passwords do not match",
      });
      requestAnimationFrame(() => document.getElementById("confirmPassword")?.focus());
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
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
          }

          toast.error(
            getAuthErrorMessage(
              error,
              "Registration failed",
            ),
          );
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-semibold text-foreground">
            Full Name <span className="text-destructive-content">*</span>
          </label>

          <InputField autoComplete="name" required
            variant="auth"
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
          <label htmlFor="dob" className="text-sm font-semibold text-foreground">
            Date of Birth <span className="text-destructive-content">*</span>
          </label>

          <CustomDatePicker
            disabled={registerMutation.isPending}
            required
            id="dob"
            ariaLabel="Date of birth"
            value={formData.dob}
            invalid={Boolean(errors.dob)}
            descriptionId={errors.dob ? "dob-error" : undefined}
            triggerClassName="h-12 rounded-2xl bg-background/80 text-sm"
            onChange={(dob) => { setFormData((current) => ({ ...current, dob })); setErrors((current) => ({ ...current, dob: "" })); }}
          />
          {errors.dob && <p id="dob-error" role="alert" className="text-xs text-destructive-content">{errors.dob}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-foreground">
          Email <span className="text-destructive-content">*</span>
        </label>

        <InputField autoComplete="email" required
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
        <label htmlFor="password" className="text-sm font-semibold text-foreground">
          Password <span className="text-destructive-content">*</span>
        </label>

        <InputField autoComplete="new-password" required
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

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
          Confirm Password <span className="text-destructive-content">*</span>
        </label>

        <InputField autoComplete="new-password" required
          variant="auth"
          id="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          icon={Lock}
          placeholder="••••••••"
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

      <Button loading={registerMutation.isPending} variant="unstyled"
        type="submit"
        disabled={registerMutation.isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_16px_32px_color-mix(in_srgb,var(--primary)_22%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary disabled:opacity-70"
      >
        <UserPlus className="h-4 w-4" />
        {registerMutation.isPending ? "Creating account..." : "Register"}
      </Button>
    </form>
  );
});

export default RegisterForm;
