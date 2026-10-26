"use client";

import { CalendarClock, Play, UsersRound } from "lucide-react";
import type { MeetingAccessResponse } from "../../types/meeting.types";
import { MeetingButton } from "../ui/meeting-form-controls";
import { Spinner } from "@/components/ui/spinner";

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
    <div className="fixed inset-0 z-[90] grid h-dvh min-h-0 overflow-y-auto py-4 [place-items:safe_center] bg-card px-4 text-foreground">
      <div className="w-full max-w-md rounded-lg border border-border bg-accent px-6 py-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/16 text-info-content ring-1 ring-ring/20">
          {access.canStart ? (
            <Play className="h-7 w-7" />
          ) : (
            <UsersRound className="h-7 w-7" />
          )}
        </span>
        <h1 className="mt-4 text-lg font-semibold">
          {access.canStart
            ? "Ready to start this meeting"
            : "Waiting for the host to start this meeting"}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
          {access.title || "Schedule a meeting"}
        </p>
        <p className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-info-content" />
          {formatScheduledRange(access)}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <MeetingButton
            type="button"
            tone="ghost"
            controlSize="lg"
            onClick={onBack}
            className="text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Back to meetings
          </MeetingButton>
          {access.canStart ? (
            <MeetingButton aria-busy={isStarting || undefined}
              type="button"
              tone="secondary"
              controlSize="lg"
              onClick={onStart}
              disabled={isStarting}
              className="bg-card font-semibold text-foreground hover:bg-muted"
            >
              {isStarting ? (
                <Spinner />
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
