"use client";

import { VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";


export function MeetingRoomLoading({ joinToken }: { joinToken: string }) {
  return (
    <div className="fixed inset-0 z-[90] grid h-dvh min-h-0 overflow-y-auto py-4 [place-items:safe_center] bg-card px-4 text-foreground">
      <div role="status" className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-accent px-6 py-8 text-center">
        <Spinner size={32} />
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
    <div className="fixed inset-0 z-[90] grid h-dvh min-h-0 overflow-y-auto py-4 [place-items:safe_center] bg-card px-4 text-foreground">
      <div className="w-full max-w-sm rounded-lg border border-border bg-accent px-6 py-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive-soft text-destructive-content ring-1 ring-destructive-outline/20">
          <VideoOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">
          Could not join meeting
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
          Check the meeting link and try again.
        </p>
        <Button variant="secondary"
          type="button"
          onClick={onBack}
          className="mt-5 h-11 cursor-pointer rounded-control px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to meetings
        </Button>
      </div>
    </div>
  );
}
