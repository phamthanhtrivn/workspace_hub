"use client";

import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import InputField from "@/components/common/input-field";
import { useRegisterMutation } from "../hooks/useAuthMutations";
import { AuthRouteTarget } from "../types/auth.constants";
import {
  registerFormSchema,
  type RegisterFormValues,
} from "../schemas/auth-form.schemas";
import { AUTH_VALIDATION_MESSAGES } from "../types/auth-validation.constants";
import { getLatestBirthDate } from "../utils/auth-date";
import { useAuthFormSubmit } from "../hooks/use-auth-form-submit";
import { AuthFormError } from "./auth-form-error";
import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";

const RegisterForm = React.memo(function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: "",
      dob: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { errors, isSubmitting } = form.formState;
  const busy = isSubmitting || registerMutation.isPending;
  const onSubmit = useAuthFormSubmit(
    form,
    ["fullName", "dob", "email", "password", "confirmPassword"],
    AUTH_VALIDATION_MESSAGES.registerFailed,
    async (values) => {
      const response = await registerMutation.mutateAsync({
        fullName: values.fullName,
        dob: values.dob || null,
        email: values.email,
        password: values.password,
      });
      toast.success(response.message);
      form.reset();
      router.replace(AuthRouteTarget.LOGIN);
    },
  );

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="text-sm font-semibold text-foreground"
          >
            Full Name <span className="text-destructive-content">*</span>
          </label>

          <InputField
            autoComplete="name"
            required
            variant="auth"
            className="text-base sm:text-sm"
            id="fullName"
            type="text"
            icon={User}
            placeholder="John Doe"
            {...form.register("fullName")}
            disabled={busy}
            error={errors.fullName?.message}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="dob"
            className="text-sm font-semibold text-foreground"
          >
            Date of Birth
          </label>

          <Controller
            control={form.control}
            name="dob"
            render={({ field, fieldState }) => (
              <CustomDatePicker
                {...field}
                disabled={busy}
                id="dob"
                ariaLabel="Date of birth"
                max={getLatestBirthDate()}
                invalid={fieldState.invalid}
                descriptionId={errors.dob ? "dob-error" : undefined}
                triggerClassName="h-12 rounded-2xl bg-background/80 text-base sm:text-sm"
              />
            )}
          />
          {errors.dob && (
            <p
              id="dob-error"
              role="alert"
              className="text-xs text-destructive-content"
            >
              {errors.dob.message}
            </p>
          )}
        </div>
      </div>

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
          {...form.register("email")}
          disabled={busy}
          error={errors.email?.message}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-foreground"
        >
          Password <span className="text-destructive-content">*</span>
        </label>

        <InputField
          autoComplete="new-password"
          required
          variant="auth"
          className="text-base sm:text-sm"
          id="password"
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder="••••••••"
          {...form.register("password", { deps: ["confirmPassword"] })}
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

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-semibold text-foreground"
        >
          Confirm Password <span className="text-destructive-content">*</span>
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
          {...form.register("confirmPassword")}
          disabled={busy}
          error={errors.confirmPassword?.message}
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

      <AuthFormError message={errors.root?.server?.message} />
      <Button
        loading={busy}
        variant="unstyled"
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_16px_32px_color-mix(in_srgb,var(--primary)_22%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary disabled:opacity-70"
      >
        <UserPlus className="h-4 w-4" />
        {busy ? "Creating account..." : "Register"}
      </Button>
    </form>
  );
});

export default RegisterForm;
