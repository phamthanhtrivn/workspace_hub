"use client";

import React from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function PublicPage() {
  const intl = useAppIntl();

  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-1 bg-slate-50 selection:bg-[var(--color-primary)] selection:text-white">
      <div className="pointer-events-none col-start-1 row-start-1 grid h-full min-h-0 w-full grid-cols-1 grid-rows-1 overflow-hidden">
        <div
          className="col-start-1 row-start-1 flex w-full -translate-y-40 transform-gpu justify-center self-start blur-3xl sm:-translate-y-80"
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
          className="col-start-1 row-start-1 flex w-full translate-y-1/4 transform-gpu justify-center self-end blur-3xl"
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
                className="hidden items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/50 hover:text-[var(--color-primary-dark)] sm:inline-flex"
              >
                {intl.formatMessage({ id: "public.nav.login" })}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 sm:px-5 sm:py-2.5"
              >
                {intl.formatMessage({ id: "public.nav.register" })}
              </Link>
            </div>
          </nav>
        </header>

        <main className="isolate flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-12 text-center sm:py-20 lg:py-24">
            <div className="mb-8 flex justify-center">
              <div className="cursor-default rounded-full px-3 py-1 text-xs leading-6 text-slate-600 ring-1 ring-slate-900/10 transition-all hover:ring-slate-900/20 sm:text-sm">
                {intl.formatMessage({ id: "public.badge" })}{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  {intl.formatMessage({ id: "public.badgeCta" })}{" "}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--color-primary-dark)] drop-shadow-sm sm:text-5xl md:text-6xl">
              {intl.formatMessage({ id: "public.heroTitle" })}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {intl.formatMessage({ id: "public.heroDescription" })}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-6">
              <Link
                href="/register"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-8 text-base font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-1 hover:bg-[var(--color-primary)] active:translate-y-0 sm:w-auto"
              >
                <UserPlus className="h-5 w-5" />
                {intl.formatMessage({ id: "public.startFree" })}
              </Link>
              <Link
                href="/login"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0 sm:w-auto"
              >
                <LogIn className="h-5 w-5" />
                {intl.formatMessage({ id: "public.nav.login" })}
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
