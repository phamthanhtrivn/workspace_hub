"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RegisterForm from "@/features/auth/components/register-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";

export default function RegisterPage() {
  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="mb-8 text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Sign Up
        </h2>

        <p className="text-sm font-semibold text-muted-foreground">
          Create an account to get started.
        </p>
      </div>

      <RegisterForm />

      <div className="my-7 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <div className="h-px flex-1 bg-accent" />
        Or continue with
        <div className="h-px flex-1 bg-accent" />
      </div>

      <SocialLoginButtons />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-primary transition hover:text-foreground underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
