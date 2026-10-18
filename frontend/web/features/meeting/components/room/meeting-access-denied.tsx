"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingAccessDeniedProps {
  onBack: () => void;
}

export function MeetingAccessDenied({ onBack }: MeetingAccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[90] grid h-dvh min-h-0 overflow-y-auto py-4 [place-items:safe_center] bg-card px-4 text-foreground">
      <div className="w-full max-w-md rounded-panel border border-border bg-accent p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-panel bg-destructive/15 text-destructive ring-1 ring-destructive/30">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-page-title font-semibold tracking-tight text-foreground">
          Access Denied
        </h1>
        <p className="mt-2.5 text-sm font-medium leading-relaxed text-muted-foreground">
          You do not have permission to join this meeting.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <MeetingButton
            type="button"
            tone="ghost"
            controlSize="md"
            onClick={onBack}
            className="bg-accent text-foreground hover:bg-accent hover:text-foreground"
          >
            Back to meetings
          </MeetingButton>
          <MeetingButton
            type="button"
            tone="primary"
            controlSize="md"
            onClick={() => router.push("/chat")}
          >
            Back to Chat
          </MeetingButton>
        </div>
      </div>
    </div>
  );
}
