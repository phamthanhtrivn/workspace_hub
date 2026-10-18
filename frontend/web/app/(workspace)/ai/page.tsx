import { createPageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = createPageMetadata("/ai");

export default function AIPage() {
  return (
    <section className="max-w-2xl">
      <h1 className="text-page-title font-semibold text-foreground">AI Assistant</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">AI Assistant is not available yet.</p>
      <Link href="/dashboard" className="mt-5 inline-flex min-h-9 items-center text-sm font-medium text-link underline underline-offset-4">Back to dashboard</Link>
    </section>
  );
}
