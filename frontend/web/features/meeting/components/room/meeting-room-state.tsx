"use client";

import { Loader2, VideoOff } from "lucide-react";

export function MeetingRoomLoading({ joinToken }: { joinToken: string }) {
  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-card px-4 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-accent px-6 py-8 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-info" />
        <h1 className="mt-4 text-lg font-semibold">Joining meeting</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {joinToken}
        </p>
      </div>
    </div>
  );
}

export function MeetingRoomError({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-card px-4 text-foreground">
      <div className="w-full max-w-sm rounded-lg border border-border bg-accent px-6 py-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/16 text-destructive ring-1 ring-destructive/20">
          <VideoOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">
          Could not join meeting
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
          Check the meeting link and try again.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 h-11 cursor-pointer rounded-control bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to meetings
        </button>
      </div>
    </div>
  );
}
