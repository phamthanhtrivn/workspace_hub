"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, Video } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingFullscreenPortalProps {
  children: ReactNode;
}

export function MeetingFullscreenPortal({
  children,
}: MeetingFullscreenPortalProps) {
  if (typeof document === "undefined") return null;

  return createPortal(children, document.body);
}

export function MeetingCreatingOverlay() {
  const intl = useAppIntl();

  return (
    <MeetingFullscreenPortal>
      <div className="fixed inset-0 z-[100] grid min-h-[100dvh] place-items-center bg-[#07111f] px-4 text-white">
        <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-white/10 bg-white/8 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-[#0052CC] shadow-[0_18px_40px_rgba(0,82,204,0.34)]">
            <Video className="h-7 w-7" />
            <Loader2 className="absolute -right-1 -top-1 h-6 w-6 animate-spin rounded-full bg-white p-1 text-[#0052CC]" />
          </span>
          <h2 className="mt-5 text-xl font-black">
            {intl.formatMessage({ id: "meeting.creating.title" })}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            {intl.formatMessage({ id: "meeting.creating.description" })}
          </p>
        </div>
      </div>
    </MeetingFullscreenPortal>
  );
}
