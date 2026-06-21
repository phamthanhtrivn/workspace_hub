import React from "react";
import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

export default function PublicPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-[var(--color-primary)] selection:text-white">
      {/* Navbar */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          className="flex items-center justify-between p-6 lg:px-8"
          aria-label="Global"
        >
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] shadow-lg">
                <span className="text-xl font-bold text-white">W</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-[var(--color-primary-dark)]">
                WorkspaceHub
              </span>
            </Link>
          </div>
          <div className="flex flex-1 justify-end gap-x-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/50 hover:text-[var(--color-primary-dark)]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0"
            >
              Đăng kí
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative isolate px-6 lg:px-8">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-background-soft)] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-2xl py-40 sm:py-44 lg:py-48 text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-slate-600 ring-1 ring-slate-900/10 hover:ring-slate-900/20 transition-all cursor-default">
              Chào mừng bạn đến với kỷ nguyên làm việc mới.{" "}
              <Link
                href="/register"
                className="font-semibold text-[var(--color-primary)]"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                Đăng kí miễn phí <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-[var(--color-primary-dark)] sm:text-6xl drop-shadow-sm">
            Nền tảng quản lý công việc thông minh
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-xl mx-auto">
            WorkspaceHub mang đến trải nghiệm quản lý tác vụ, tài liệu và lịch
            trình học tập tuyệt vời, tích hợp AI để tối ưu hóa hiệu suất của bạn
            mỗi ngày.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-8 text-base font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-1 hover:bg-[var(--color-primary)] active:translate-y-0"
            >
              <UserPlus className="h-5 w-5" />
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-8 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0"
            >
              <LogIn className="h-5 w-5" />
              Đăng nhập
            </Link>
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[var(--color-secondary)] to-[var(--color-background-soft)] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </main>
    </div>
  );
}
