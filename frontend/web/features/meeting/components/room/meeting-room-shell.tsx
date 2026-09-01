"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useParticipants,
  useRoomContext,
  useTrackToggle,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { ConnectionState, Track } from "livekit-client";
import {
  type LucideIcon,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { cn } from "@/lib/utils";
import { meetingRoomControlItems } from "../../types/meeting.constants";
import { MeetingRoomPanel } from "../../types/meeting.types";
import type { MeetingPreJoinSettings } from "../../types/meeting.types";
import { useJoinMeetingRoom } from "../../hooks/useJoinMeetingRoom";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";

interface MeetingRoomShellProps {
  joinToken: string;
}

interface MeetingRoomContentProps {
  joinToken: string;
}

interface ParticipantMetadata {
  role?: string;
  avatarUrl?: string | null;
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

function getInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return letters || "U";
}

function parseParticipantMetadata(participant: Participant): ParticipantMetadata {
  if (!participant.metadata) return {};

  try {
    return JSON.parse(participant.metadata) as ParticipantMetadata;
  } catch {
    return {};
  }
}

function getRoleLabelId(role?: string) {
  return role === "HOST"
    ? "meeting.room.participant.host"
    : "meeting.room.participant.guest";
}

function getRoomStatusLabelId(connectionState: ConnectionState) {
  if (connectionState === ConnectionState.Connected) {
    return "meeting.room.statusConnected";
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return "meeting.room.statusReconnecting";
  }

  return "meeting.room.statusConnecting";
}

function MeetingRoomLoading({ joinToken }: { joinToken: string }) {
  const intl = useAppIntl();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-white/10 bg-white/8 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <Loader2 className="h-9 w-9 animate-spin text-blue-200" />
        <h1 className="mt-4 text-lg font-black">
          {intl.formatMessage({ id: "meeting.room.joining" })}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-300">
          {intl.formatMessage(
            { id: "meeting.room.token" },
            { token: joinToken },
          )}
        </p>
      </div>
    </div>
  );
}

function MeetingRoomError({ onBack }: { onBack: () => void }) {
  const intl = useAppIntl();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white/8 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/16 text-red-200 ring-1 ring-red-300/20">
          <VideoOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-black">
          {intl.formatMessage({ id: "meeting.room.joinFailed" })}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          {intl.formatMessage({ id: "meeting.room.joinFailedDescription" })}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 h-11 rounded-lg bg-white px-5 text-sm font-black text-[#172B4D] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {intl.formatMessage({ id: "meeting.room.backToMeetings" })}
        </button>
      </div>
    </div>
  );
}

function MeetingParticipantTile({
  trackRef,
  isMainTile,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  isMainTile: boolean;
}) {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const participant = trackRef.participant;
  const metadata = parseParticipantMetadata(participant);
  const isLocalUser = participant.isLocal;
  const displayName =
    participant.name ||
    (isLocalUser ? authUser.fullName || authUser.email : null) ||
    participant.identity ||
    intl.formatMessage({ id: "app.user" });
  const avatarUrl = isLocalUser
    ? authUser.avatarUrl || metadata.avatarUrl
    : metadata.avatarUrl;
  const hasVideo =
    isTrackReference(trackRef) &&
    Boolean(trackRef.publication.track) &&
    !trackRef.publication.isMuted;

  return (
    <article
      className={cn(
        "relative flex min-h-[220px] overflow-hidden rounded-lg border border-white/10 bg-[#121a28] shadow-[0_18px_48px_rgba(0,0,0,0.24)]",
        isMainTile ? "lg:col-span-2 lg:row-span-2" : "",
      )}
    >
      {hasVideo && isTrackReference(trackRef) ? (
        <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,#20304a,transparent_38%),#0c121d] text-center">
          {avatarUrl ? (
            <span
              aria-label={displayName}
              role="img"
              className="h-24 w-24 rounded-full bg-cover bg-center ring-2 ring-white/14"
              style={{ backgroundImage: `url("${avatarUrl}")` }}
            />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-white/12 text-3xl font-black text-white ring-1 ring-white/14">
              {getInitials(displayName)}
            </span>
          )}
          <p className="text-sm font-bold text-slate-300">
            {intl.formatMessage({ id: "meeting.room.cameraPaused" })}
          </p>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="min-w-0 rounded-md bg-black/45 px-3 py-2 backdrop-blur">
          <p className="truncate text-sm font-black">{displayName}</p>
          <p className="text-xs font-semibold text-slate-300">
            {intl.formatMessage({ id: getRoleLabelId(metadata.role) })}
          </p>
        </div>
        {isLocalUser ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/45 text-white backdrop-blur">
            {participant.isMicrophoneEnabled ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4 text-red-300" />
            )}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function MeetingParticipantsPanel() {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const participants = useParticipants();

  return (
    <div className="mt-4 space-y-2">
      {participants.map((participant) => {
        const metadata = parseParticipantMetadata(participant);
        const displayName =
          participant.name ||
          (participant.isLocal ? authUser.fullName || authUser.email : null) ||
          participant.identity ||
          intl.formatMessage({ id: "app.user" });
        const avatarUrl = participant.isLocal
          ? authUser.avatarUrl || metadata.avatarUrl
          : metadata.avatarUrl;

        return (
          <div
            key={participant.identity}
            className="flex items-center gap-3 rounded-lg bg-white/6 p-3 ring-1 ring-white/8"
          >
            {avatarUrl ? (
              <span
                aria-label={displayName}
                role="img"
                className="h-10 w-10 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url("${avatarUrl}")` }}
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-xs font-black">
                {getInitials(displayName)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">
                {displayName}
              </span>
              <span className="block text-xs font-semibold text-slate-400">
                {intl.formatMessage({ id: getRoleLabelId(metadata.role) })}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MeetingMediaToggleButton({
  source,
  enabledLabelId,
  disabledLabelId,
  enabledIcon,
  disabledIcon,
}: {
  source: Track.Source.Camera | Track.Source.Microphone;
  enabledLabelId: string;
  disabledLabelId: string;
  enabledIcon: LucideIcon;
  disabledIcon: LucideIcon;
}) {
  const intl = useAppIntl();
  const { enabled, pending, toggle } = useTrackToggle({ source });

  return (
    <MeetingRoomControlButton
      label={intl.formatMessage({
        id: enabled ? enabledLabelId : disabledLabelId,
      })}
      icon={enabled ? enabledIcon : disabledIcon}
      active={enabled}
      disabled={pending}
      onClick={() => void toggle()}
    />
  );
}

function MeetingRoomContent({ joinToken }: MeetingRoomContentProps) {
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
            <p className="truncate text-xs font-semibold text-slate-400">
              {intl.formatMessage(
                { id: "meeting.room.token" },
                { token: joinToken },
              )}
            </p>
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

        {activePanel !== MeetingRoomPanel.NONE ? (
          <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-[#0d1420] p-4 lg:block">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black">
                {intl.formatMessage({
                  id:
                    activePanel === MeetingRoomPanel.PARTICIPANTS
                      ? "meeting.room.panel.participants"
                      : activePanel === MeetingRoomPanel.CHAT
                        ? "meeting.room.panel.chat"
                        : "meeting.room.panel.settings",
                })}
              </h2>
              <button
                type="button"
                onClick={() => setActivePanel(MeetingRoomPanel.NONE)}
                aria-label={intl.formatMessage({ id: "app.close" })}
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activePanel === MeetingRoomPanel.PARTICIPANTS ? (
              <MeetingParticipantsPanel />
            ) : activePanel === MeetingRoomPanel.CHAT ? (
              <div className="mt-4 flex h-[calc(100%-3.5rem)] flex-col rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
                <div className="flex flex-1 items-center justify-center text-center text-sm font-semibold leading-6 text-slate-400">
                  <span>
                    {intl.formatMessage({ id: "meeting.room.panel.chatEmpty" })}
                  </span>
                </div>
                <div className="flex h-11 items-center rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-semibold text-slate-500">
                  {intl.formatMessage({ id: "meeting.room.panel.chatInput" })}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
                  <p className="text-sm font-black text-slate-100">
                    {intl.formatMessage({
                      id: "meeting.room.panel.autoAdminTitle",
                    })}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
                    {intl.formatMessage(
                      {
                        id: "meeting.room.panel.autoAdminDescription",
                      },
                      { count: participants.length },
                    )}
                  </p>
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </main>

      <footer className="flex shrink-0 items-center justify-center border-t border-white/10 bg-[#0d1420]/95 px-3 py-3 backdrop-blur">
        <div className="flex max-w-full items-center gap-2 overflow-x-auto">
          <MeetingMediaToggleButton
            source={Track.Source.Microphone}
            enabledLabelId="meeting.room.control.mute"
            disabledLabelId="meeting.room.control.unmute"
            enabledIcon={Mic}
            disabledIcon={MicOff}
          />
          <MeetingMediaToggleButton
            source={Track.Source.Camera}
            enabledLabelId="meeting.room.control.stopVideo"
            disabledLabelId="meeting.room.control.startVideo"
            enabledIcon={Video}
            disabledIcon={VideoOff}
          />

          {meetingRoomControlItems.slice(2).map((control) => {
            const isPanelControl =
              control.id === MeetingRoomPanel.PARTICIPANTS ||
              control.id === MeetingRoomPanel.CHAT ||
              control.id === MeetingRoomPanel.SETTINGS;
            const isActive = isPanelControl && activePanel === control.id;

            return (
              <MeetingRoomControlButton
                key={control.id}
                label={intl.formatMessage({ id: control.labelId })}
                icon={control.icon}
                active={isActive}
                disabled={!isPanelControl}
                onClick={() => {
                  if (isPanelControl) {
                    setActivePanel((current) =>
                      current === control.id
                        ? MeetingRoomPanel.NONE
                        : control.id,
                    );
                  }
                }}
              />
            );
          })}

          <MeetingRoomControlButton
            label={intl.formatMessage({ id: "meeting.room.control.leave" })}
            icon={LogOut}
            danger
            onClick={handleLeave}
          />
        </div>
      </footer>

      {activePanel !== MeetingRoomPanel.NONE ? (
        <div className="border-t border-white/10 bg-[#0d1420] p-3 lg:hidden">
          <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2 text-sm font-black text-slate-200 ring-1 ring-white/8">
            <span>
              {intl.formatMessage({
                id:
                  activePanel === MeetingRoomPanel.PARTICIPANTS
                    ? "meeting.room.panel.participants"
                    : activePanel === MeetingRoomPanel.CHAT
                      ? "meeting.room.panel.chat"
                      : "meeting.room.panel.settings",
              })}
            </span>
            <button
              type="button"
              onClick={() => setActivePanel(MeetingRoomPanel.NONE)}
              className="grid h-8 w-8 place-items-center rounded-md bg-white/8"
              aria-label={intl.formatMessage({ id: "app.close" })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <RoomAudioRenderer />
    </div>
  );
}

function getAudioSetting(settings: MeetingPreJoinSettings) {
  if (!settings.microphoneEnabled) return false;

  return {
    deviceId: settings.microphoneDeviceId || undefined,
  };
}

function getVideoSetting(settings: MeetingPreJoinSettings) {
  if (!settings.cameraEnabled) return false;

  return {
    deviceId: settings.cameraDeviceId || undefined,
  };
}

export function MeetingRoomShell({ joinToken }: MeetingRoomShellProps) {
  const router = useRouter();
  const { room, settings, isLoading, isError } = useJoinMeetingRoom(joinToken);

  if (isLoading) {
    return <MeetingRoomLoading joinToken={joinToken} />;
  }

  if (isError || !room) {
    return <MeetingRoomError onBack={() => router.push("/meetings")} />;
  }

  return (
    <LiveKitRoom
      serverUrl={room.livekit.serverUrl}
      token={room.livekit.token}
      connect
      audio={getAudioSetting(settings)}
      video={getVideoSetting(settings)}
      onDisconnected={() => router.push("/meetings")}
      onMediaDeviceFailure={() => undefined}
      className="contents"
    >
      <MeetingRoomContent joinToken={joinToken} />
    </LiveKitRoom>
  );
}
