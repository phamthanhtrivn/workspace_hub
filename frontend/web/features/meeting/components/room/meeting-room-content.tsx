import { useLocalParticipant, useTracks } from "@livekit/components-react";
import type { AudioCaptureOptions, VideoCaptureOptions } from "livekit-client";
import { Track } from "livekit-client";
import { Users } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingResponse, UserProfileSnapshot } from "../../types/meeting.types";
import {
  MeetingAvatarTile,
  MeetingParticipantTile,
} from "./participants/meeting-participant-tile";
import { MeetingRoomControlBar } from "./controls/meeting-room-control-bar";
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
  const { localParticipant } = useLocalParticipant();
  const trackRefs = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const localTrack =
    trackRefs.find(
      (trackRef) => trackRef.participant.identity === localParticipant.identity,
    ) ?? trackRefs[0];
  const otherTracks = trackRefs.filter(
    (trackRef) => trackRef.participant.identity !== localParticipant.identity,
  );
  const profileByUserId = new Map(
    (meeting.participants ?? []).map((participant) => [
      participant.userId,
      participant.profile ?? null,
    ]),
  );

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col bg-[#111827] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="sr-only">
          {intl.formatMessage({ id: "nav.meetings" })}
        </span>
        <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-bold text-slate-100">
          <Users className="h-4 w-4 text-blue-300" />
          {trackRefs.length}
        </div>
      </header>

      {mediaError ? (
        <div className="mx-4 mt-4 rounded-md border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-100">
          {mediaError}
        </div>
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
        <section className="flex min-h-[420px] min-w-0 flex-1 items-center justify-center">
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
          {otherTracks.length ? (
            otherTracks.map((trackRef) => {
              const participantProfile = resolveParticipantProfile(
                profileByUserId.get(trackRef.participant.identity),
                trackRef.participant.metadata,
              );
              const participantDisplayName =
                participantProfile.fullName ||
                participantProfile.email ||
                trackRef.participant.name ||
                trackRef.participant.identity;

              return (
                <MeetingParticipantTile
                  key={trackRef.participant.identity}
                  avatarUrl={participantProfile.avatarUrl}
                  displayName={participantDisplayName}
                  initials={buildParticipantInitials(participantDisplayName)}
                  trackRef={trackRef}
                  variant="secondary"
                />
              );
            })
          ) : (
            <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.04] px-4 text-center text-sm font-semibold text-slate-400">
              {intl.formatMessage({ id: "meeting.room.noOtherParticipants" })}
            </div>
          )}
        </aside>
      </main>

      <MeetingRoomControlBar
        isHost={isHost}
        audioCaptureOptions={audioCaptureOptions}
        videoCaptureOptions={videoCaptureOptions}
        onDeviceError={onDeviceError}
      />
    </div>
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
