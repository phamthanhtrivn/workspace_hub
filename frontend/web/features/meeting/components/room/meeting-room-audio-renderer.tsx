"use client";

import {
  AudioTrack,
  isTrackReference,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface MeetingRoomAudioRendererProps {
  mutedParticipantIds: ReadonlySet<string>;
}

export function MeetingRoomAudioRenderer({
  mutedParticipantIds,
}: MeetingRoomAudioRendererProps) {
  const audioTracks = useTracks(
    [
      Track.Source.Microphone,
      Track.Source.ScreenShareAudio,
      Track.Source.Unknown,
    ],
    { updateOnlyOn: [], onlySubscribed: true },
  ).filter(
    (trackRef) =>
      isTrackReference(trackRef) &&
      !trackRef.participant.isLocal &&
      trackRef.publication.kind === Track.Kind.Audio,
  );

  return (
    <div style={{ display: "none" }}>
      {audioTracks.map((trackRef) =>
        isTrackReference(trackRef) ? (
          <AudioTrack
            key={`${trackRef.participant.identity}-${trackRef.publication.trackSid}`}
            trackRef={trackRef}
            muted={mutedParticipantIds.has(trackRef.participant.identity)}
          />
        ) : null,
      )}
    </div>
  );
}
