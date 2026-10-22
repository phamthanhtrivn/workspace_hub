import { createPageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LoginForm from "@/features/auth/components/login-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";

export const metadata = createPageMetadata("/login");

export default function LoginPage() {
  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-link transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="mb-8 justify-center text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Sign In
        </h2>
        <p className="text-sm font-semibold text-muted-foreground">
          Welcome back! Please enter your details.
        </p>
      </div>

      <LoginForm />

      <div className="my-7 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <div className="h-px flex-1 bg-accent" />
        Or continue with
        <div className="h-px flex-1 bg-accent" />
      </div>

      <SocialLoginButtons />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-link transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring underline"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
