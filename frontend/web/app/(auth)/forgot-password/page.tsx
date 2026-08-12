import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-8 justify-center text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-primary-dark)] sm:text-4xl">
          Forgot password?
        </h2>
        <p className="text-sm font-semibold text-[var(--color-secondary)] mt-2">
          No worries. We will help you regain access to your account.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
