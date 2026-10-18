"use client";

import type { ReactNode } from "react";
import { DialogPortal } from "@/components/ui/dialog";
import { Loader2, Video } from "lucide-react";

interface MeetingFullscreenPortalProps {
  children: ReactNode;
}

export function MeetingFullscreenPortal({
  children,
}: MeetingFullscreenPortalProps) {
  if (typeof document === "undefined") return null;

  return <DialogPortal>{children}</DialogPortal>;
}

export function MeetingCreatingOverlay() {
  return (
    <MeetingFullscreenPortal>
      <div className="fixed inset-0 z-[100] grid h-dvh min-h-0 overflow-y-auto py-4 [place-items:safe_center] bg-card px-4 text-foreground">
        <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-accent px-6 py-8 text-center">
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Video className="h-7 w-7" />
            <Loader2 className="absolute -right-1 -top-1 h-6 w-6 animate-spin rounded-full bg-card p-1 text-info-content" />
          </span>
          <h2 className="mt-5 text-section-title font-semibold">
            Creating meeting room
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
            Preparing your room and device settings.
          </p>
        </div>
      </div>
    </MeetingFullscreenPortal>
  );
}
