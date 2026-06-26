import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[#f5f9fb] text-[var(--color-primary-dark)]">
      <div className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden overflow-hidden bg-[#071b34] lg:grid lg:grid-cols-1 lg:grid-rows-1">
          <div className="col-start-1 row-start-1 bg-[radial-gradient(circle_at_20%_10%,rgba(73,136,196,0.38),transparent_34%),radial-gradient(circle_at_88%_82%,rgba(189,232,245,0.18),transparent_30%)]" />
          <div className="col-start-1 row-start-1 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:72px_72px]" />

          <div className="pointer-events-none col-start-1 row-start-1 h-full w-full">
            <div className="h-24 w-24 translate-x-16 translate-y-14 rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/30 backdrop-blur" />
          </div>

          <div className="pointer-events-none col-start-1 row-start-1 flex h-full w-full items-end justify-end">
            <div className="mb-12 mr-10 h-44 w-44 rounded-[3rem] b    order border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/40 backdrop-blur" />
          </div>

          <div className="z-10 col-start-1 row-start-1 flex h-full w-full flex-col justify-start px-20 pt-54">
            <Link
              href="/"
              className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang chủ
            </Link>
            <div className="max-w-2xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-3.5 py-2 text-sm font-medium text-cyan-50 shadow-xl shadow-blue-950/20 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-[#9fd8e7]" />
                Intelligent Workspace for Personal and Team
              </div>

              <h1 className="max-w-xl text-balance text-6xl font-black leading-[0.95] tracking-tight text-white xl:text-7xl">
                WorkspaceHub
              </h1>

              <p className="mt-7 max-w-lg text-pretty text-lg leading-8 text-slate-300">
                Quản lý công việc, tài liệu, học tập, lịch trình và trao đổi
                trong một không gian làm việc rõ ràng và thông minh hơn với sự
                hỗ trợ của AI.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[29rem]">
            <div className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_70px_rgba(15,40,84,0.14)] backdrop-blur-xl sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
