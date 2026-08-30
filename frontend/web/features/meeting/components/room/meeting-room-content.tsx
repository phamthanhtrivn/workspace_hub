import {
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { AudioCaptureOptions, VideoCaptureOptions } from "livekit-client";
import { Track } from "livekit-client";
import { Loader2, UserRoundPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  MeetingParticipant,
  MeetingParticipantStatus,
  MeetingResponse,
  MeetingRole,
  UserProfileSnapshot,
} from "../../types/meeting.types";
import {
  MeetingAvatarTile,
  MeetingParticipantTile,
} from "./participants/meeting-participant-tile";
import { MeetingParticipantsModal } from "./participants/meeting-participants-modal";
import { MeetingRoomControlBar } from "./controls/meeting-room-control-bar";
import { HostJoinRequestsPanel } from "./host-join-requests-panel";
import { buildParticipantInitials } from "./meeting-room.utils";

interface MeetingRoomContentProps {
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
  canModerate: boolean;
  meeting: MeetingResponse;
  mediaError: string | null;
  audioCaptureOptions?: AudioCaptureOptions;
  videoCaptureOptions?: VideoCaptureOptions;
  onDeviceError: (error: Error) => void;
  onRoomExitReported: () => void;
}

export function MeetingRoomContent({
  avatarUrl,
  displayName,
  initials,
  canModerate,
  meeting,
  mediaError,
  audioCaptureOptions,
  videoCaptureOptions,
  onDeviceError,
  onRoomExitReported,
}: MeetingRoomContentProps) {
  const intl = useAppIntl();
  const [isJoinRequestsPanelOpen, setIsJoinRequestsPanelOpen] =
    useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] =
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
  const participantByUserId = useMemo(
    () =>
      new Map(
        (meeting.participants ?? []).map((participant) => [
          participant.userId,
          participant,
        ]),
      ),
    [meeting.participants],
  );
  const connectedParticipantIds = useMemo(
    () => new Set(participants.map((participant) => participant.identity)),
    [participants],
  );
  const pendingLiveKitParticipants = useMemo(
    () =>
      (meeting.participants ?? []).filter(
        (participant) =>
          participant.status === MeetingParticipantStatus.JOINED &&
          !participant.leftAt &&
          participant.userId !== localParticipant.identity &&
          !connectedParticipantIds.has(participant.userId),
      ),
    [connectedParticipantIds, localParticipant.identity, meeting.participants],
  );
  const pendingJoinRequestCount = meeting.pendingJoinRequestCount ?? 0;
  const localRoleLabel = resolveRoleLabel(
    meeting.currentParticipant,
    meeting.hostId,
    intl.formatMessage,
  );

  return (
    <div className="flex h-screen min-h-0 bg-[#111827] text-white">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => setIsParticipantsModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-white/15"
            aria-label={intl.formatMessage({
              id: "meeting.room.participants.open",
            })}
          >
            <Users className="h-4 w-4 text-blue-300" />
            {participants.length}
          </button>

          {canModerate ? (
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
                roleLabel={localRoleLabel}
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

          <aside className="grid shrink-0 content-start gap-3 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
            {remoteParticipants.length || pendingLiveKitParticipants.length ? (
              <>
                {remoteParticipants.map((participant) => {
                  const trackRef = findParticipantCameraTrack(
                    trackRefs,
                    participant.identity,
                  );
                  const participantProfile = resolveParticipantProfile(
                    participantByUserId.get(participant.identity)?.profile,
                    participant.metadata,
                  );
                  const participantRoleLabel = resolveRoleLabel(
                    participantByUserId.get(participant.identity),
                    meeting.hostId,
                    intl.formatMessage,
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
                      roleLabel={participantRoleLabel}
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
                })}
                {pendingLiveKitParticipants.map((participant) => (
                  <MeetingParticipantConnectingTile
                    key={participant.userId}
                    displayName={
                      participant.profile?.fullName ||
                      participant.profile?.email ||
                      intl.formatMessage({
                        id: "meeting.room.participantConnecting",
                      })
                    }
                  />
                ))}
              </>
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
          canModerate={canModerate}
          joinToken={meeting.joinToken}
          meeting={meeting}
          audioCaptureOptions={audioCaptureOptions}
          videoCaptureOptions={videoCaptureOptions}
          onDeviceError={onDeviceError}
          onRoomExitReported={onRoomExitReported}
        />
      </div>

      {canModerate && isJoinRequestsPanelOpen ? (
        <HostJoinRequestsPanel
          meeting={meeting}
          onClose={() => setIsJoinRequestsPanelOpen(false)}
        />
      ) : null}

      {isParticipantsModalOpen ? (
        <MeetingParticipantsModal
          connectedParticipantIds={connectedParticipantIds}
          meeting={meeting}
          onClose={() => setIsParticipantsModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MeetingParticipantConnectingTile({
  displayName,
}: { displayName: string }) {
  const intl = useAppIntl();

  return (
    <div className="relative grid aspect-video min-h-32 w-full place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#1f2937] shadow-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10">
          <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
        </div>
        <div className="px-3">
          <p className="max-w-48 truncate text-sm font-black text-white">
            {displayName}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {intl.formatMessage({ id: "meeting.room.participantConnecting" })}
          </p>
        </div>
      </div>
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

function resolveRoleLabel(
  participant: MeetingParticipant | null | undefined,
  hostId: string,
  formatMessage: (descriptor: { id: string }) => string,
) {
  if (!participant) return null;
  if (participant.userId === hostId || participant.role === MeetingRole.HOST) {
    return formatMessage({ id: "meeting.room.participants.host" });
  }
  if (participant.role === MeetingRole.COHOST) {
    return formatMessage({ id: "meeting.room.participants.cohost" });
  }
  return null;
}
