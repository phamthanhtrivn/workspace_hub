"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MeetingParticipantStatus, MeetingResponse } from "../../types/meeting.types";
import { MeetingJoinStatePanel } from "./meeting-join-state-panel";

interface MeetingJoinRoomModalProps {
  joinToken: string;
  meeting: MeetingResponse;
  participantStatus: MeetingParticipantStatus | null;
  isRequestingJoin: boolean;
  onRequestJoin: () => void;
}

export function MeetingJoinRoomModal({
  joinToken,
  meeting,
  participantStatus,
  isRequestingJoin,
  onRequestJoin,
}: MeetingJoinRoomModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 py-6"
      role="presentation"
    >
      <MeetingJoinStatePanel
        joinToken={joinToken}
        meeting={meeting}
        participantStatus={participantStatus}
        isRequestingJoin={isRequestingJoin}
        onRequestJoin={onRequestJoin}
      />
    </div>,
    portalTarget,
  );
}
