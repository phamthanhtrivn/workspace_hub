"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function PomodoroPage() {
  const intl = useAppIntl();

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
        {intl.formatMessage({ id: "app.workspace" })}
      </p>
      <h1 className="mt-2 text-3xl font-black text-[var(--color-primary-dark)]">
        {intl.formatMessage({ id: "nav.pomodoro" })}
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600">
        {intl.formatMessage({ id: "page.pomodoro.description" })}
      </p>
    </section>
  );
}
