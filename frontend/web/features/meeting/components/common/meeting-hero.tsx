"use client";

import { Clock3 } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingHeroProps {
  dateLabel: string;
  timeLabel: string;
  upcomingMeetingCount: number;
  onUpcomingClick: () => void;
}

export function MeetingHero({
  dateLabel,
  timeLabel,
  upcomingMeetingCount,
  onUpcomingClick,
}: MeetingHeroProps) {
  const intl = useAppIntl();

  return (
    <section className="relative min-h-[230px] overflow-hidden rounded-lg bg-[#172B4D] px-6 py-6 text-white shadow-[0_18px_48px_rgba(23,43,77,0.18)] sm:px-8">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_70%_15%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,rgba(0,82,204,0.25),rgba(255,171,0,0.16))] lg:block" />
      <div className="absolute right-8 top-8 hidden h-32 w-48 rotate-3 rounded-lg border border-white/15 bg-white/10 shadow-2xl backdrop-blur-sm lg:block" />
      <div className="absolute bottom-8 right-24 hidden h-24 w-36 -rotate-6 rounded-lg border border-white/12 bg-slate-900/30 shadow-2xl lg:block" />

      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-between gap-12">
        <button
          type="button"
          onClick={onUpcomingClick}
          className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-white/14 px-3 py-2 text-sm font-bold text-blue-50 ring-1 ring-white/18 transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Clock3 className="h-4 w-4" />
          <span>
            {intl.formatMessage(
              { id: "meeting.dashboard.heroBadge" },
              { count: upcomingMeetingCount },
            )}
          </span>
        </button>

        <div>
          <p className="text-sm font-bold text-blue-100">
            {intl.formatMessage({ id: "meeting.dashboard.heroEyebrow" })}
          </p>
          <h1 className="mt-2 text-5xl font-black leading-none tracking-normal sm:text-6xl">
            {timeLabel}
          </h1>
          <p className="mt-3 text-lg font-bold text-slate-200 sm:text-xl">
            {dateLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
