import {
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { AudioCaptureOptions, VideoCaptureOptions } from "livekit-client";
import { Track } from "livekit-client";
import { UserRoundPlus, Users } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingResponse, UserProfileSnapshot } from "../../types/meeting.types";
import {
  MeetingAvatarTile,
  MeetingParticipantTile,
} from "./participants/meeting-participant-tile";
import { MeetingRoomControlBar } from "./controls/meeting-room-control-bar";
import { HostJoinRequestsPanel } from "./host-join-requests-panel";
import { buildParticipantInitials } from "./meeting-room.utils";

interface MeetingRoomContentProps {
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
  isHost: boolean;
  meeting: MeetingResponse;
  mediaError: string | null;
  audioCaptureOptions?: AudioCaptureOptions;
  videoCaptureOptions?: VideoCaptureOptions;
  onDeviceError: (error: Error) => void;
}

export function MeetingRoomContent({
  avatarUrl,
  displayName,
  initials,
  isHost,
  meeting,
  mediaError,
  audioCaptureOptions,
  videoCaptureOptions,
  onDeviceError,
}: MeetingRoomContentProps) {
  const intl = useAppIntl();
  const [isJoinRequestsPanelOpen, setIsJoinRequestsPanelOpen] =
    useState(false);
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const trackRefs = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const localTrack = findParticipantCameraTrack(
    trackRefs,
    localParticipant.identity,
  );
  const remoteParticipants = participants.filter(
    (participant) => participant.identity !== localParticipant.identity,
  );
  const profileByUserId = new Map(
    (meeting.participants ?? []).map((participant) => [
      participant.userId,
      participant.profile ?? null,
    ]),
  );
  const pendingJoinRequestCount = meeting.pendingJoinRequestCount ?? 0;

  return (
    <div className="flex h-screen min-h-0 bg-[#111827] text-white">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-bold text-slate-100">
            <Users className="h-4 w-4 text-blue-300" />
            {participants.length}
          </div>

          {isHost ? (
            <button
              type="button"
              onClick={() => setIsJoinRequestsPanelOpen((value) => !value)}
              className="relative flex h-9 items-center gap-2 rounded-md bg-white/10 px-3 text-xs font-bold text-slate-100 hover:bg-white/15"
            >
              <UserRoundPlus className="h-4 w-4 text-blue-300" />
              {pendingJoinRequestCount > 0 ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                  {pendingJoinRequestCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </header>

        {mediaError ? (
          <div className="mx-4 mt-4 rounded-md border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-100">
            {mediaError}
          </div>
        ) : null}

        <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
          <section className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
            {localTrack ? (
              <MeetingParticipantTile
                avatarUrl={avatarUrl}
                displayName={displayName}
                initials={initials}
                trackRef={localTrack}
                variant="primary"
              />
            ) : (
              <MeetingAvatarTile
                avatarUrl={avatarUrl}
                displayName={displayName}
                initials={initials}
                variant="primary"
              />
            )}
          </section>

          <aside className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-64 lg:grid-cols-1">
            {remoteParticipants.length ? (
              remoteParticipants.map((participant) => {
                const trackRef = findParticipantCameraTrack(
                  trackRefs,
                  participant.identity,
                );
                const participantProfile = resolveParticipantProfile(
                  profileByUserId.get(participant.identity),
                  participant.metadata,
                );
                const participantDisplayName =
                  participantProfile.fullName ||
                  participantProfile.email ||
                  participant.name ||
                  participant.identity;
                const participantInitials = buildParticipantInitials(
                  participantDisplayName,
                );

                return trackRef ? (
                  <MeetingParticipantTile
                    key={participant.identity}
                    avatarUrl={participantProfile.avatarUrl}
                    displayName={participantDisplayName}
                    initials={participantInitials}
                    trackRef={trackRef}
                    variant="secondary"
                  />
                ) : (
                  <div
                    key={participant.identity}
                    className="relative aspect-video min-h-32 w-full overflow-hidden rounded-lg border border-white/10 bg-[#1f2937] shadow-2xl"
                  >
                    <MeetingAvatarTile
                      avatarUrl={participantProfile.avatarUrl}
                      displayName={participantDisplayName}
                      initials={participantInitials}
                      variant="secondary"
                    />
                  </div>
                );
              })
            ) : (
              <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.04] px-4 text-center text-sm font-semibold text-slate-400">
                {intl.formatMessage({
                  id: "meeting.room.noOtherParticipants",
                })}
              </div>
            )}
          </aside>
        </main>

        <MeetingRoomControlBar
          isHost={isHost}
          joinToken={meeting.joinToken}
          meeting={meeting}
          audioCaptureOptions={audioCaptureOptions}
          videoCaptureOptions={videoCaptureOptions}
          onDeviceError={onDeviceError}
        />
      </div>

      {isHost && isJoinRequestsPanelOpen ? (
        <HostJoinRequestsPanel
          meeting={meeting}
          onClose={() => setIsJoinRequestsPanelOpen(false)}
        />
      ) : null}
    </div>
  );
}

function findParticipantCameraTrack(
  trackRefs: TrackReferenceOrPlaceholder[],
  participantIdentity: string,
) {
  return trackRefs.find(
    (trackRef) =>
      trackRef.participant.identity === participantIdentity &&
      trackRef.source === Track.Source.Camera,
  );
}

function resolveParticipantProfile(
  snapshot?: UserProfileSnapshot | null,
  metadata?: string,
): Pick<UserProfileSnapshot, "avatarUrl" | "email" | "fullName"> {
  const metadataProfile = parseParticipantMetadata(metadata);

  return {
    avatarUrl: snapshot?.avatarUrl ?? metadataProfile.avatarUrl ?? null,
    email: snapshot?.email ?? metadataProfile.email ?? null,
    fullName: snapshot?.fullName ?? null,
  };
}

function parseParticipantMetadata(
  metadata?: string,
): Pick<UserProfileSnapshot, "avatarUrl" | "email"> {
  if (!metadata) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return {
      avatarUrl:
        typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch {
    return {};
  }
}
