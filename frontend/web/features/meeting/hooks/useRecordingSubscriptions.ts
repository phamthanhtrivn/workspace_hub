"use client";

import { useEffect } from "react";
import { RemoteTrackPublication } from "livekit-client";
import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { syncRecordingSubscriptions } from "../utils/recording-subscriptions";
import { isRecordingParticipant } from "../utils/recording-participants";

export function useRecordingSubscriptions(
  tracks: TrackReferenceOrPlaceholder[],
  main: TrackReferenceOrPlaceholder | undefined,
  tiles: TrackReferenceOrPlaceholder[],
  includeSharedAudio = false,
) {
  useEffect(() => {
    const visible = new Set<string>();
    for (const track of [main, ...tiles])
      if (track && isTrackReference(track) && !track.publication.isMuted)
        visible.add(track.publication.trackSid);
    const publications: RemoteTrackPublication[] = [];
    const excluded = new Set<string>();
    for (const track of tracks) {
      if (
        !isTrackReference(track) ||
        !(track.publication instanceof RemoteTrackPublication)
      )
        continue;
      publications.push(track.publication);
      if (!isRecordingParticipant(track.participant))
        excluded.add(track.publication.trackSid);
    }
    syncRecordingSubscriptions(
      publications,
      visible,
      includeSharedAudio,
      excluded,
    );
  }, [tracks, main, tiles, includeSharedAudio]);
}
