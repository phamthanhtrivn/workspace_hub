import React from "react";
import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

export default function PublicPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-1 bg-slate-50 selection:bg-[var(--color-primary)] selection:text-white">
      {/* Background Layer */}
      <div className="pointer-events-none col-start-1 row-start-1 grid h-full w-full grid-cols-1 grid-rows-1 overflow-hidden min-h-0">
        <div
          className="col-start-1 row-start-1 flex w-full justify-center self-start -translate-y-40 transform-gpu blur-3xl sm:-translate-y-80"
          aria-hidden="true"
        >
          <div
            className="aspect-[1155/678] w-[36.125rem] -translate-x-1/4 rotate-[30deg] bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-background-soft)] opacity-30 sm:-translate-x-1/2 sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <div
          className="col-start-1 row-start-1 flex w-full justify-center self-end translate-y-1/4 transform-gpu blur-3xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[1155/678] w-[36.125rem] translate-x-1/4 bg-gradient-to-tr from-[var(--color-secondary)] to-[var(--color-background-soft)] opacity-30 sm:translate-x-1/2 sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </div>

      {/* Content Layer */}
      <div className="col-start-1 row-start-1 flex flex-col">
        <header className="z-50 w-full">
          <nav
            className="flex items-center justify-between p-4 sm:p-6 lg:px-8"
            aria-label="Global"
          >
            <div className="flex lg:flex-1">
              <Link href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] shadow-lg">
                  <span className="text-xl font-bold text-white">W</span>
                </div>
                <span className="hidden text-xl font-bold tracking-tight text-[var(--color-primary-dark)] sm:block">
                  WorkspaceHub
                </span>
              </Link>
            </div>
            <div className="flex flex-1 justify-end gap-x-3 sm:gap-x-4">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/50 hover:text-[var(--color-primary-dark)]"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0"
              >
                Đăng kí
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="isolate flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-12 text-center sm:py-20 lg:py-24">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full px-3 py-1 text-xs sm:text-sm leading-6 text-slate-600 ring-1 ring-slate-900/10 transition-all hover:ring-slate-900/20 cursor-default">
                Kỷ nguyên làm việc thông minh.{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  Đăng kí ngay <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--color-primary-dark)] drop-shadow-sm sm:text-5xl md:text-6xl">
              Nền tảng quản lý công việc thông minh
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-slate-600">
              WorkspaceHub mang đến trải nghiệm quản lý tác vụ, tài liệu và lịch
              trình học tập tuyệt vời, tích hợp AI để tối ưu hóa hiệu suất của
              bạn mỗi ngày.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
              <Link
                href="/register"
                className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-8 text-base font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-1 hover:bg-[var(--color-primary)] active:translate-y-0"
              >
                <UserPlus className="h-5 w-5" />
                Bắt đầu miễn phí
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0"
              >
                <LogIn className="h-5 w-5" />
                Đăng nhập
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
