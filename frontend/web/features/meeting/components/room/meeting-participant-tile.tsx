"use client";

import {
  VideoTrack,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Pin } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingParticipantTile } from "@/features/meeting/hooks/useMeetingParticipantTile";
import { cn } from "@/lib/utils";
import { AvatarFallback } from "../common/avatar-fallback";
import { MeetingIconDropdown } from "../common/meeting-icon-dropdown";

interface MeetingParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isMainTile: boolean;
  isAudioMutedForMe?: boolean;
  isPinnedForMe?: boolean;
  isPreferencePending?: boolean;
  onToggleAudioMute?: (participantId: string) => void;
  onTogglePin?: (participantId: string) => void;
}

export function MeetingParticipantTile({
  trackRef,
  isMainTile,
  isAudioMutedForMe = false,
  isPinnedForMe = false,
  isPreferencePending = false,
  onToggleAudioMute,
  onTogglePin,
}: MeetingParticipantTileProps) {
  const intl = useAppIntl();
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
    roleLabelId,
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
      className={cn(
        "relative flex min-h-[220px] overflow-hidden rounded-lg border border-white/10 bg-[#121a28] shadow-[0_18px_48px_rgba(0,0,0,0.24)] transition-[border-color,box-shadow] duration-200",
        shouldShowSpeakingHighlight
          ? "border-emerald-300/70 shadow-[0_0_0_1px_rgba(110,231,183,0.42),0_0_34px_rgba(16,185,129,0.36),0_18px_48px_rgba(0,0,0,0.24)] ring-2 ring-emerald-300/45"
          : "",
        isMainTile ? "lg:col-span-2 lg:row-span-2" : "",
      )}
    >
      {isPinnedForMe ? (
        <span
          className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md bg-blue-500/90 text-white shadow-[0_10px_28px_rgba(12,102,228,0.28)] ring-1 ring-blue-100/35 backdrop-blur"
          aria-label={pinnedLabel}
          title={pinnedLabel}
        >
          <Pin className="h-4 w-4" />
        </span>
      ) : null}

      {actionItems.length > 0 ? (
        <div className="absolute right-3 top-3 z-10 rounded-md bg-black/35 backdrop-blur">
          <MeetingIconDropdown label={actionMenuLabel} items={actionItems} />
        </div>
      ) : null}

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
            <AvatarFallback
              label={displayName}
              className="grid h-24 w-24 place-items-center rounded-full bg-slate-200/90 ring-1 ring-white/14 shadow-sm"
              iconClassName="h-11 w-11 text-slate-400"
            />
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="min-w-0 rounded-md bg-black/45 px-3 py-2 backdrop-blur">
          <p className="truncate text-sm font-black">{displayName}</p>
          {roleLabelId ? (
            <p className="text-xs font-semibold text-slate-300">
              {intl.formatMessage({ id: roleLabelId })}
            </p>
          ) : null}
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/45 text-white backdrop-blur"
          aria-label={participantAudioLabel}
          title={participantAudioLabel}
        >
          <AudioStatusIcon className={audioStatusIconClassName} />
        </span>
      </div>
    </article>
  );
}
