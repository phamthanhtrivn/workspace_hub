import {
  ParticipantTile,
  TrackMutedIndicator,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { User } from "lucide-react";
import { useState } from "react";

interface MeetingParticipantTileProps {
  avatarUrl?: string | null;
  displayName: string;
  roleLabel?: string | null;
  trackRef: TrackReferenceOrPlaceholder;
  variant: "primary" | "secondary";
}

export function MeetingParticipantTile({
  avatarUrl,
  displayName,
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
  variant: "primary" | "secondary";
}

export function MeetingAvatarTile({
  avatarUrl,
  displayName,
  variant,
}: MeetingAvatarTileProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarSize = variant === "primary" ? "h-28 w-28" : "h-16 w-16";
  const iconSize = variant === "primary" ? 44 : 26;
  const imageUrl =
    typeof avatarUrl === "string" && avatarUrl !== failedAvatarUrl
      ? avatarUrl
      : undefined;

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#20242b]">
      <div
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-50 to-slate-200 text-slate-400 shadow-sm ring-1 ring-slate-200/50 ${avatarSize}`}
        aria-label={displayName}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            onError={() => setFailedAvatarUrl(imageUrl)}
          />
        ) : (
          <User size={iconSize} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

interface MeetingParticipantAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  className?: string;
  iconSize?: number;
}

export function MeetingParticipantAvatar({
  avatarUrl,
  displayName,
  className = "h-10 w-10",
  iconSize = 18,
}: MeetingParticipantAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const imageUrl =
    typeof avatarUrl === "string" &&
    avatarUrl.trim() &&
    avatarUrl !== failedAvatarUrl
      ? avatarUrl
      : undefined;

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-700 text-slate-300 ring-1 ring-white/10 ${className}`}
      aria-label={displayName}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailedAvatarUrl(imageUrl)}
        />
      ) : (
        <User size={iconSize} aria-hidden="true" />
      )}
    </div>
  );
}
