import {
  ParticipantTile,
  TrackMutedIndicator,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";

interface MeetingParticipantTileProps {
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
  roleLabel?: string | null;
  trackRef: TrackReferenceOrPlaceholder;
  variant: "primary" | "secondary";
}

export function MeetingParticipantTile({
  avatarUrl,
  displayName,
  initials,
  roleLabel,
  trackRef,
  variant,
}: MeetingParticipantTileProps) {
  const hasActiveVideo =
    isTrackReference(trackRef) &&
    !trackRef.publication.isMuted &&
    Boolean(trackRef.publication.track);
  const sizeClass =
    variant === "primary"
      ? "h-full max-h-[620px] min-h-[360px] w-full max-w-4xl"
      : "min-h-32 aspect-video w-full";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/10 bg-[#1f2937] shadow-2xl ${sizeClass}`}
    >
      {hasActiveVideo ? (
        <ParticipantTile
          trackRef={trackRef}
          className="h-full w-full [&_.lk-participant-metadata]:hidden [&_.lk-participant-placeholder]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        >
          <VideoTrack
            trackRef={trackRef}
            className="h-full w-full object-cover"
          />
        </ParticipantTile>
      ) : (
        <MeetingAvatarTile
          avatarUrl={avatarUrl}
          displayName={displayName}
          initials={initials}
          variant={variant}
        />
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[80%] items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-bold text-white">
        <TrackMutedIndicator
          trackRef={{
            participant: trackRef.participant,
            source: Track.Source.Microphone,
          }}
          show="muted"
        />
        <span className="truncate">{displayName}</span>
        {roleLabel ? (
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-blue-100">
            {roleLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface MeetingAvatarTileProps {
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
  variant: "primary" | "secondary";
}

export function MeetingAvatarTile({
  avatarUrl,
  displayName,
  initials,
  variant,
}: MeetingAvatarTileProps) {
  const avatarSize =
    variant === "primary" ? "h-28 w-28 text-3xl" : "h-16 w-16 text-lg";

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#20242b]">
      <div
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 font-black text-white ${avatarSize}`}
        aria-label={displayName}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}
