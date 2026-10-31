import { createPageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";

export const metadata = createPageMetadata("/forgot-password");

export default function ForgotPasswordPage() {
  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-link transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sign In
      </Link>

      <div className="mb-8 justify-center text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Forgot Password?
        </h2>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
