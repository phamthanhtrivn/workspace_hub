"use client";

import { FolderKanban } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export function ProjectCalendarsSection() {
  const intl = useAppIntl();

  return (
    <section className="mt-5" aria-labelledby="project-calendars-heading">
      <div className="mb-2 flex items-center gap-2 px-2">
        <FolderKanban className="h-4 w-4 text-[var(--color-primary)]" />
        <h2
          id="project-calendars-heading"
          className="flex-1 text-sm font-semibold text-slate-700"
        >
          {intl.formatMessage({ id: "calendar.projects" })}
        </h2>
      </div>

      <p className="px-8 py-1 text-xs font-medium leading-5 text-slate-400">
        {intl.formatMessage({ id: "calendar.noProjects" })}
      </p>
    </section>
  );
}
