"use client";

import { useEffect } from "react";
import { RemoteTrackPublication } from "livekit-client";
import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { syncRecordingSubscriptions } from "../utils/recording-subscriptions";

export function useRecordingSubscriptions(
  tracks: TrackReferenceOrPlaceholder[],
  main: TrackReferenceOrPlaceholder | undefined,
  tiles: TrackReferenceOrPlaceholder[],
) {
  useEffect(() => {
    const visible = new Set<string>();
    for (const track of [main, ...tiles])
      if (track && isTrackReference(track) && !track.publication.isMuted)
        visible.add(track.publication.trackSid);
    const publications = tracks
      .filter(isTrackReference)
      .filter((track) => !track.participant.isLocal)
      .map((track) => track.publication)
      .filter(
        (publication): publication is RemoteTrackPublication =>
          publication instanceof RemoteTrackPublication,
      );
    syncRecordingSubscriptions(publications, visible);
  }, [tracks, main, tiles]);
}
