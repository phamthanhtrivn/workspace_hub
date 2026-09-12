"use client";

import { CalendarClock, Loader2, Play, UsersRound } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { MeetingAccessResponse } from "../../types/meeting.types";

interface MeetingWaitingHostProps {
  access: MeetingAccessResponse;
  isStarting: boolean;
  onBack: () => void;
  onStart: () => void;
}

function formatScheduledRange(access: MeetingAccessResponse, locale: string) {
  if (!access.scheduledStartAt || !access.scheduledEndAt) return "";
  const start = new Date(access.scheduledStartAt);
  const end = new Date(access.scheduledEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  return `${start.toLocaleDateString(locale, {
    dateStyle: "medium",
  })} · ${start.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function MeetingWaitingHost({
  access,
  isStarting,
  onBack,
  onStart,
}: MeetingWaitingHostProps) {
  const intl = useAppIntl();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/8 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-500/16 text-blue-100 ring-1 ring-blue-300/20">
          {access.canStart ? (
            <Play className="h-7 w-7" />
          ) : (
            <UsersRound className="h-7 w-7" />
          )}
        </span>
        <h1 className="mt-4 text-lg font-black">
          {intl.formatMessage({
            id: access.canStart
              ? "meeting.waitingForHost.hostTitle"
              : "meeting.waitingForHost.title",
          })}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          {access.title || intl.formatMessage({ id: "meeting.schedule.title" })}
        </p>
        <p className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-white/8 px-3 py-2 text-sm font-bold text-slate-200">
          <CalendarClock className="h-4 w-4 text-blue-200" />
          {formatScheduledRange(access, intl.locale)}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onBack}
            className="h-11 cursor-pointer rounded-lg px-5 text-sm font-black text-slate-200 hover:bg-white/10"
          >
            {intl.formatMessage({ id: "meeting.room.backToMeetings" })}
          </button>
          {access.canStart ? (
            <button
              type="button"
              onClick={onStart}
              disabled={isStarting}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-[#172B4D] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {intl.formatMessage({ id: "meeting.waitingForHost.start" })}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
