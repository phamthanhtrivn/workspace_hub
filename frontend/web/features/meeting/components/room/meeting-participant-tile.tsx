"use client";

import {
  VideoTrack,
  isTrackReference,
  useIsSpeaking,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Mic, MicOff, User } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";
import {
  getRoleLabelId,
  parseParticipantMetadata,
} from "../../utils/meeting-room.utils";

interface MeetingParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isMainTile: boolean;
}

export function MeetingParticipantTile({
  trackRef,
  isMainTile,
}: MeetingParticipantTileProps) {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);
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
  const microphoneLabelId = participant.isMicrophoneEnabled
    ? "meeting.room.control.microphoneOn"
    : "meeting.room.control.microphoneOff";

  return (
    <article
      className={cn(
        "relative flex min-h-[220px] overflow-hidden rounded-lg border border-white/10 bg-[#121a28] shadow-[0_18px_48px_rgba(0,0,0,0.24)] transition-[border-color,box-shadow] duration-200",
        isSpeaking
          ? "border-emerald-300/70 shadow-[0_0_0_1px_rgba(110,231,183,0.42),0_0_34px_rgba(16,185,129,0.36),0_18px_48px_rgba(0,0,0,0.24)] ring-2 ring-emerald-300/45"
          : "",
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
            <span className="grid h-24 w-24 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/14">
              <User className="h-11 w-11 text-slate-300" />
            </span>
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="min-w-0 rounded-md bg-black/45 px-3 py-2 backdrop-blur">
          <p className="truncate text-sm font-black">{displayName}</p>
          <p className="text-xs font-semibold text-slate-300">
            {intl.formatMessage({ id: getRoleLabelId(metadata.role) })}
          </p>
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/45 text-white backdrop-blur"
          aria-label={intl.formatMessage({ id: microphoneLabelId })}
          title={intl.formatMessage({ id: microphoneLabelId })}
        >
          {participant.isMicrophoneEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4 text-red-300" />
          )}
        </span>
      </div>
    </article>
  );
}
