import type { Metadata } from "next";
import { EmailVerificationForm } from "@/features/auth/components/email-verification-form";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const query = await searchParams;
  const initialEmail = typeof query.email === "string" ? query.email.slice(0, 254) : "";
  return (
    <div>
      <h2 className="mb-8 text-center text-3xl font-black tracking-tight">
        Verify your email
      </h2>
      <EmailVerificationForm initialEmail={initialEmail} />
    </div>
  );
}
