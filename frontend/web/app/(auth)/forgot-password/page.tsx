"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function ForgotPasswordPage() {
  const intl = useAppIntl();

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {intl.formatMessage({ id: "auth.backToSignIn" })}
      </Link>

      <div className="mb-8 justify-center text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-primary-dark)] sm:text-4xl">
          {intl.formatMessage({ id: "auth.forgotPassword" })}
        </h2>
        <p className="text-sm font-semibold text-[var(--color-secondary)] mt-2">
          {intl.formatMessage({ id: "auth.forgotSubtitle" })}
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
