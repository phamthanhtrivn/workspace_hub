"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { MeetingParticipantTile } from "./meeting-participant-tile";

interface MeetingRoomStageProps {
  activeScreenShareTrack: TrackReferenceOrPlaceholder | null;
  visibleCameraTracks: TrackReferenceOrPlaceholder[];
  participantGridClassName: string;
  participantTileFrameClassName: string;
  mutedParticipantIds: Set<string>;
  pinnedParticipantId: string | null;
  isParticipantViewPreferencePending: (participantId: string) => boolean;
  onToggleParticipantAudioMute: (participantId: string) => void;
  onToggleParticipantPin: (participantId: string) => void;
}

export function MeetingRoomStage({
  activeScreenShareTrack,
  visibleCameraTracks,
  participantGridClassName,
  participantTileFrameClassName,
  mutedParticipantIds,
  pinnedParticipantId,
  isParticipantViewPreferencePending,
  onToggleParticipantAudioMute,
  onToggleParticipantPin,
}: MeetingRoomStageProps) {
  if (activeScreenShareTrack) {
    return (
      <div className="flex min-h-full flex-col justify-center gap-4">
        <div className="mx-auto aspect-video w-full max-w-6xl min-h-[18rem] overflow-hidden rounded-lg bg-black shadow-[0_24px_64px_rgba(0,0,0,0.34)] ring-1 ring-white/10">
          <MeetingParticipantTile
            trackRef={activeScreenShareTrack}
            isMainTile
            isScreenShare
            isAudioMutedForMe={mutedParticipantIds.has(
              activeScreenShareTrack.participant.identity,
            )}
            isPinnedForMe={
              pinnedParticipantId === activeScreenShareTrack.participant.identity
            }
            isPreferencePending={isParticipantViewPreferencePending(
              activeScreenShareTrack.participant.identity,
            )}
            onToggleAudioMute={onToggleParticipantAudioMute}
            onTogglePin={onToggleParticipantPin}
          />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,14rem))] justify-center gap-3">
          {visibleCameraTracks.map((trackRef) => (
            <div
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              className="aspect-video [&>article]:!min-h-0 [&>article]:h-full"
            >
              <MeetingParticipantTile
                trackRef={trackRef}
                isMainTile={false}
                isAudioMutedForMe={mutedParticipantIds.has(
                  trackRef.participant.identity,
                )}
                isPinnedForMe={
                  pinnedParticipantId === trackRef.participant.identity
                }
                isPreferencePending={isParticipantViewPreferencePending(
                  trackRef.participant.identity,
                )}
                onToggleAudioMute={onToggleParticipantAudioMute}
                onTogglePin={onToggleParticipantPin}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={participantGridClassName}>
      {visibleCameraTracks.map((trackRef) => (
        <div
          key={`${trackRef.participant.identity}-${trackRef.source}`}
          className={participantTileFrameClassName}
        >
          <MeetingParticipantTile
            trackRef={trackRef}
            isMainTile={false}
            isAudioMutedForMe={mutedParticipantIds.has(
              trackRef.participant.identity,
            )}
            isPinnedForMe={pinnedParticipantId === trackRef.participant.identity}
            isPreferencePending={isParticipantViewPreferencePending(
              trackRef.participant.identity,
            )}
            onToggleAudioMute={onToggleParticipantAudioMute}
            onTogglePin={onToggleParticipantPin}
          />
        </div>
      ))}
    </div>
  );
}
