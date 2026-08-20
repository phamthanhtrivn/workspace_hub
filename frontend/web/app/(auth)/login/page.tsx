"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LoginForm from "@/features/auth/components/login-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function LoginPage() {
  const intl = useAppIntl();

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {intl.formatMessage({ id: "auth.backToHome" })}
      </Link>

      <div className="mb-8 justify-center text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-primary-dark)] sm:text-4xl">
          {intl.formatMessage({ id: "auth.login" })}
        </h2>
        <p className="text-sm font-semibold text-[var(--color-secondary)]">
          {intl.formatMessage({ id: "auth.loginSubtitle" })}
        </p>
      </div>

      <LoginForm />

      <div className="my-7 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        {intl.formatMessage({ id: "auth.orContinueWith" })}
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <SocialLoginButtons />

      <p className="mt-8 text-center text-sm text-slate-500">
        {intl.formatMessage({ id: "auth.noAccount" })}{" "}
        <Link
          href="/register"
          className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] underline"
        >
          {intl.formatMessage({ id: "auth.createAccount" })}
        </Link>
      </p>
    </div>
  );
}
