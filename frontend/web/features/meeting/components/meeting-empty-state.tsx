"use client";

import { Video } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingEmptyStateProps {
  titleId: string;
  descriptionId: string;
}

export function MeetingEmptyState({
  titleId,
  descriptionId,
}: MeetingEmptyStateProps) {
  const intl = useAppIntl();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50">
          <Video className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {intl.formatMessage({ id: titleId })}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {intl.formatMessage({ id: descriptionId })}
          </p>
        </div>
      </div>
    </section>
  );
}
