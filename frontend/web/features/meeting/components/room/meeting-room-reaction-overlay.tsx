"use client";

import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { MEETING_ROOM_REACTION_ANIMATION_MS } from "../../types/meeting.constants";
import type { MeetingRoomReactionResponse } from "../../types/meeting.types";

interface MeetingRoomReactionOverlayProps {
  containerRef: RefObject<HTMLElement | null>;
  reactions: MeetingRoomReactionResponse[];
}

interface ReactionPosition {
  left: number;
  top: number;
  travelY: number;
  driftX: number;
}

function getReactionDrift(reactionId: string) {
  const seed = reactionId
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return (seed % 72) - 36;
}

function FloatingMeetingReaction({
  containerRef,
  reaction,
}: {
  containerRef: RefObject<HTMLElement | null>;
  reaction: MeetingRoomReactionResponse;
}) {
  const [position, setPosition] = useState<ReactionPosition | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const visibleHeight = container.clientHeight || containerRect.height;
    const participantTile = document.querySelector<HTMLElement>(
      `[data-meeting-participant-id="${reaction.userId}"]`,
    );
    const tileRect = participantTile?.getBoundingClientRect();
    const fallbackLeft = containerRect.width / 2;
    const fallbackTop = container.scrollTop + visibleHeight - 72;

    if (
      tileRect &&
      tileRect.width > 0 &&
      tileRect.height > 0 &&
      tileRect.bottom >= containerRect.top &&
      tileRect.top <= containerRect.bottom
    ) {
      setPosition({
        left: tileRect.left - containerRect.left + tileRect.width / 2,
        top:
          container.scrollTop +
          tileRect.top -
          containerRect.top +
          tileRect.height * 0.72,
        travelY: visibleHeight * 0.75,
        driftX: getReactionDrift(reaction.id),
      });
      return;
    }

    setPosition({
      left: fallbackLeft,
      top: fallbackTop,
      travelY: visibleHeight * 0.75,
      driftX: getReactionDrift(reaction.id),
    });
  }, [containerRef, reaction.id, reaction.userId]);

  const style = useMemo<CSSProperties>(
    () => ({
      left: position?.left ?? "50%",
      top: position?.top ?? "85%",
      ["--meeting-reaction-drift-x" as string]: `${position?.driftX ?? 0}px`,
      ["--meeting-reaction-travel-y" as string]: `${
        position?.travelY ?? 260
      }px`,
      ["--meeting-reaction-duration" as string]: `${MEETING_ROOM_REACTION_ANIMATION_MS}ms`,
    }),
    [position],
  );

  return (
    <span
      aria-hidden="true"
      className="meeting-room-floating-reaction absolute z-30 grid h-12 w-12 select-none place-items-center rounded-full bg-black/24 text-3xl shadow-[0_16px_38px_rgba(0,0,0,0.28)] ring-1 ring-white/20 backdrop-blur"
      style={style}
    >
      {reaction.emoji}
    </span>
  );
}

export function MeetingRoomReactionOverlay({
  containerRef,
  reactions,
}: MeetingRoomReactionOverlayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {reactions.map((reaction) => (
        <FloatingMeetingReaction
          key={reaction.id}
          containerRef={containerRef}
          reaction={reaction}
        />
      ))}
    </div>
  );
}
