import type { Metadata } from "next";
import { EmailVerificationForm } from "@/features/auth/components/email-verification-form";
import { AuthLink as Link } from "@/features/auth/components/auth-link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const query = await searchParams;
  const initialEmail = typeof query.email === "string" ? query.email.slice(0, 254) : "";
  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-link">
        <ArrowLeft className="size-4" /> Back to Sign In
      </Link>
      <div className="mb-8 text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Verify Your Email</h2>
        <p className="text-sm font-semibold text-muted-foreground">Confirm your email to activate your account.</p>
      </div>
      <EmailVerificationForm initialEmail={initialEmail} />
    </div>
  );
}
