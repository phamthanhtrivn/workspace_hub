import { PRIVATE_ROBOTS } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata = { robots: PRIVATE_ROBOTS };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden overflow-hidden bg-brand-navy text-brand-ice lg:grid lg:grid-cols-1 lg:grid-rows-1">
          <div className="col-start-1 row-start-1 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--primary)_38%,transparent),transparent_34%),radial-gradient(circle_at_88%_82%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_30%)]" />
          <div className="col-start-1 row-start-1 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--brand-ice)_4%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--brand-ice)_4%,transparent)_1px,transparent_1px)] bg-[size:72px_72px]" />

          <div className="pointer-events-none col-start-1 row-start-1 h-full w-full">
            <div className="h-24 w-24 translate-x-16 translate-y-14 rounded-[2rem] border border-border/10 bg-overlay/10 shadow-2xl shadow-overlay/30 backdrop-blur" />
          </div>

          <div className="pointer-events-none col-start-1 row-start-1 flex h-full w-full items-end justify-end">
            <div className="mb-12 mr-10 h-44 w-44 rounded-[3rem] border border-border/10 bg-overlay/10 shadow-2xl shadow-overlay/40 backdrop-blur" />
          </div>

          <div className="z-10 col-start-1 row-start-1 flex h-full w-full flex-col justify-start px-20 pt-54">
            <Link
              href="/"
              className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-brand-ice transition hover:text-brand-ice focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ice"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to main page
            </Link>
            <div className="max-w-2xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-border/12 bg-overlay/10 px-3.5 py-2 text-sm font-medium text-brand-ice shadow-xl shadow-overlay/20 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-brand-ice" />
                Intelligent Workspace Platform
              </div>

              <h1 className="max-w-xl text-balance text-6xl font-black leading-[0.95] tracking-tight text-brand-ice xl:text-7xl">
                WorkspaceHub
              </h1>

              <p className="mt-7 max-w-lg text-pretty text-lg leading-8 text-brand-ice">
                Centralize tasks, notes, calendar events, and team collaboration in one intelligent workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[29rem]">
            <div className="rounded-[1.75rem] border border-border/80 bg-card/88 p-5 shadow-[0_24px_70px_color-mix(in_srgb,var(--primary)_14%,transparent)] backdrop-blur-xl sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
