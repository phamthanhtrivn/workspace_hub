"use client";

import { CalendarClock, Loader2, Play, UsersRound } from "lucide-react";
import type { MeetingAccessResponse } from "../../types/meeting.types";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingWaitingHostProps {
  access: MeetingAccessResponse;
  isStarting: boolean;
  onBack: () => void;
  onStart: () => void;
}

function formatScheduledRange(access: MeetingAccessResponse) {
  if (!access.scheduledStartAt || !access.scheduledEndAt) return "";
  const start = new Date(access.scheduledStartAt);
  const end = new Date(access.scheduledEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  return `${start.toLocaleDateString("en-US", {
    dateStyle: "medium",
  })} · ${start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("en-US", {
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
          {access.canStart
            ? "Ready to start this meeting"
            : "Waiting for the host to start this meeting"}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          {access.title || "Schedule a meeting"}
        </p>
        <p className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-white/8 px-3 py-2 text-sm font-bold text-slate-200">
          <CalendarClock className="h-4 w-4 text-blue-200" />
          {formatScheduledRange(access)}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <MeetingButton
            type="button"
            tone="ghost"
            controlSize="lg"
            onClick={onBack}
            className="text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Back to meetings
          </MeetingButton>
          {access.canStart ? (
            <MeetingButton
              type="button"
              tone="secondary"
              controlSize="lg"
              onClick={onStart}
              disabled={isStarting}
              className="bg-white font-black text-[#172B4D] hover:bg-slate-100"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start meeting
            </MeetingButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
