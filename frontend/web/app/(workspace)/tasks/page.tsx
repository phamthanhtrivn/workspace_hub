import { createPageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = createPageMetadata("/tasks");

export default function TasksPage() {
  return (
    <section className="max-w-2xl">
      <h1 className="text-page-title font-semibold text-foreground">Tasks</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Manage tasks in Projects, Calendar, and Dashboard.</p>
      <nav className="mt-5 flex flex-wrap gap-5 text-sm font-medium text-link" aria-label="Task workflows">
        <Link href="/projects" className="min-h-9 py-2 underline underline-offset-4">Open projects</Link>
        <Link href="/calendar" className="min-h-9 py-2 underline underline-offset-4">Open calendar</Link>
        <Link href="/dashboard" className="min-h-9 py-2 underline underline-offset-4">Open dashboard</Link>
      </nav>
    </section>
  );
}
