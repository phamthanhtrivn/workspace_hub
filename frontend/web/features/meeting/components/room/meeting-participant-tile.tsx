"use client";

import {
  VideoTrack,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Hand, MonitorUp, Pin } from "lucide-react";
import { useMeetingParticipantTile } from "@/features/meeting/hooks/useMeetingParticipantTile";
import { cn } from "@/lib/utils";
import { AvatarFallback } from "../common/avatar-fallback";
import { MeetingIconDropdown } from "../common/meeting-icon-dropdown";

interface MeetingParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isMainTile: boolean;
  isScreenShare?: boolean;
  isAudioMutedForMe?: boolean;
  isPinnedForMe?: boolean;
  handRaisedAt?: string | null;
  isPreferencePending?: boolean;
  onToggleAudioMute?: (participantId: string) => void;
  onTogglePin?: (participantId: string) => void;
}

export function MeetingParticipantTile({
  trackRef,
  isMainTile,
  isScreenShare = false,
  isAudioMutedForMe = false,
  isPinnedForMe = false,
  handRaisedAt = null,
  isPreferencePending = false,
  onToggleAudioMute,
  onTogglePin,
}: MeetingParticipantTileProps) {
  const {
    actionItems,
    actionMenuLabel,
    AudioStatusIcon,
    audioStatusIconClassName,
    avatarUrl,
    displayName,
    hasVideo,
    participantAudioLabel,
    pinnedLabel,
    roleLabel,
    shouldShowSpeakingHighlight,
  } = useMeetingParticipantTile({
    trackRef,
    isAudioMutedForMe,
    isPinnedForMe,
    isPreferencePending,
    onToggleAudioMute,
    onTogglePin,
  });

  return (
    <article
      data-meeting-participant-id={trackRef.participant.identity}
      className={cn(
        "relative flex min-h-0 min-w-0 h-full overflow-hidden rounded-panel border border-border bg-media-background text-media-foreground transition-colors duration-200",
        shouldShowSpeakingHighlight
          ? "border-success/70 ring-2 ring-success/45"
          : "",
        isMainTile ? "lg:col-span-2 lg:row-span-2" : "",
        isScreenShare ? "bg-overlay" : "",
      )}
    >
      {isPinnedForMe ? (
        <span
          className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md bg-primary/90 text-primary-foreground ring-1 ring-ring/35 shadow-panel"
          aria-label={pinnedLabel}
          title={pinnedLabel}
        >
          <Pin className="h-4 w-4" />
        </span>
      ) : null}

      {handRaisedAt ? (
        <span
          className="absolute left-3 top-12 z-10 grid h-8 w-8 place-items-center rounded-md bg-warning/95 text-warning-foreground ring-1 ring-warning/70 shadow-panel"
          aria-label="Hand raised"
          title="Hand raised"
        >
          <Hand className="h-4 w-4" />
        </span>
      ) : null}

      {actionItems.length > 0 ? (
        <div className="absolute right-3 top-3 z-10 rounded-md bg-overlay/35 backdrop-blur">
          <MeetingIconDropdown label={actionMenuLabel} items={actionItems} />
        </div>
      ) : null}

      {hasVideo && isTrackReference(trackRef) ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn(
            "h-full w-full",
            isScreenShare ? "bg-overlay object-contain" : "object-cover",
          )}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,var(--media-background),transparent_38%),var(--media-background)] text-center">
          {avatarUrl ? (
            <span
              aria-label={displayName}
              role="img"
              className="h-24 w-24 rounded-full bg-cover bg-center ring-2 ring-border/14"
              style={{ backgroundImage: `url("${avatarUrl}")` }}
            />
          ) : (
            <AvatarFallback
              label={displayName}
              className="grid h-24 w-24 place-items-center rounded-full bg-accent/90 ring-1 ring-border/14"
              iconClassName="h-11 w-11 text-muted-foreground"
            />
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="min-w-0 rounded-md bg-overlay/90 px-3 py-2 text-media-foreground backdrop-blur">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          {roleLabel ? (
            <p className="text-xs font-semibold text-media-foreground">
              {roleLabel}
            </p>
          ) : null}
          {isScreenShare ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-media-foreground">
              <MonitorUp className="h-3.5 w-3.5" />
              Sharing screen
            </p>
          ) : null}
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-overlay/90 text-media-foreground backdrop-blur"
          aria-label={participantAudioLabel}
          title={participantAudioLabel}
        >
          <AudioStatusIcon className={audioStatusIconClassName} />
        </span>
      </div>
    </article>
  );
}
