"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RoomAudioRenderer,
  useConnectionState,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Video } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import type { MeetingPreJoinSettings } from "../../types/meeting.types";
import { MeetingRoomPanel } from "../../types/meeting.types";
import {
  formatElapsedTime,
  getRoomStatusLabelId,
} from "../../utils/meeting-room.utils";
import { MeetingParticipantTile } from "./meeting-participant-tile";
import { MeetingRoomFooter } from "./meeting-room-footer";
import {
  MeetingRoomDesktopSidePanel,
  MeetingRoomMobilePanelHeader,
} from "./meeting-room-side-panel";

interface MeetingRoomContentProps {
  settings: MeetingPreJoinSettings;
}

export function MeetingRoomContent({ settings }: MeetingRoomContentProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const [activePanel, setActivePanel] = useState(MeetingRoomPanel.NONE);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const sortedCameraTracks = useMemo(
    () =>
      [...cameraTracks].sort((first, second) => {
        if (first.participant.isLocal) return -1;
        if (second.participant.isLocal) return 1;

        return first.participant.identity.localeCompare(
          second.participant.identity,
        );
      }),
    [cameraTracks],
  );

  const handleLeave = () => {
    room.disconnect();
    router.push("/meetings");
  };

  const closePanel = () => setActivePanel(MeetingRoomPanel.NONE);

  return (
    <div className="fixed inset-0 z-[90] flex min-h-[100dvh] flex-col overflow-hidden bg-[#070b12] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d1420]/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0052CC] shadow-[0_12px_28px_rgba(0,82,204,0.28)]">
            <Video className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black sm:text-base">
              {intl.formatMessage({ id: "meeting.room.title" })}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-md bg-emerald-500/12 px-3 py-1.5 text-xs font-black text-emerald-200 ring-1 ring-emerald-300/15 sm:inline-flex">
            {intl.formatMessage({
              id: getRoomStatusLabelId(connectionState),
            })}
          </span>
          <span className="rounded-md bg-white/8 px-3 py-1.5 text-xs font-black text-slate-100 ring-1 ring-white/10">
            {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div
            className={cn(
              "grid min-h-full gap-4",
              activePanel === MeetingRoomPanel.NONE
                ? "lg:grid-cols-3"
                : "lg:grid-cols-2",
            )}
          >
            {sortedCameraTracks.map((trackRef) => (
              <MeetingParticipantTile
                key={`${trackRef.participant.identity}-${trackRef.source}`}
                trackRef={trackRef}
                isMainTile={
                  trackRef.participant.isLocal &&
                  activePanel === MeetingRoomPanel.NONE
                }
              />
            ))}
          </div>
        </section>

        <MeetingRoomDesktopSidePanel
          activePanel={activePanel}
          participantCount={participants.length}
          onClose={closePanel}
        />
      </main>

      <MeetingRoomFooter
        activePanel={activePanel}
        settings={settings}
        onPanelChange={setActivePanel}
        onLeave={handleLeave}
      />

      <MeetingRoomMobilePanelHeader
        activePanel={activePanel}
        onClose={closePanel}
      />

      <RoomAudioRenderer />
    </div>
  );
}
