"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { MeetingResponse } from "../../types/meeting.types";
import { buildParticipantInitials } from "../room/meeting-room.utils";

interface MeetingWaitingRoomSurfaceProps {
  meeting: MeetingResponse;
}

export function MeetingWaitingRoomSurface({
  meeting,
}: MeetingWaitingRoomSurfaceProps) {
  const intl = useAppIntl();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { avatarUrl, email, fullName } = useAppSelector((state) => state.auth);
  const profile = meeting.currentParticipant?.profile;
  const displayName =
    profile?.fullName || profile?.email || fullName || email || "Meeting participant";
  const resolvedAvatarUrl = profile?.avatarUrl || avatarUrl;
  const initials = buildParticipantInitials(displayName);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPortalTarget(document.body);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <section className="fixed inset-0 z-50 flex min-h-0 bg-[#111827] text-white">
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
          <div className="relative flex h-full max-h-[620px] min-h-[360px] w-full max-w-4xl items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#1f2937] shadow-2xl">
            <div className="flex max-w-md flex-col items-center px-6 text-center">
              <div
                className="relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 text-3xl font-black text-white"
                aria-label={displayName}
              >
                {resolvedAvatarUrl ? (
                  <Image
                    src={resolvedAvatarUrl}
                    alt={displayName}
                    fill
                    sizes="112px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <p className="mt-5 text-sm font-black text-white">
                {intl.formatMessage({ id: "meeting.requestWaiting" })}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                {intl.formatMessage({
                  id: "meeting.room.waitingApprovalHelp",
                })}
              </p>
            </div>

            <div className="absolute bottom-2 left-2 max-w-[80%] rounded-md bg-black/55 px-2 py-1 text-xs font-bold text-white">
              <span className="truncate">{displayName}</span>
            </div>
          </div>
        </main>
      </div>
    </section>,
    portalTarget,
  );
}
