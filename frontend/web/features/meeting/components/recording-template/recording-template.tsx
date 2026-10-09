"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  useSpeakingParticipants,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent, ParticipantKind } from "livekit-client";
import EgressHelper from "@livekit/egress-sdk";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { RecordingLayout } from "../../types/meeting-recording.types";
import { selectRecordingStage } from "../../utils/recording-stage";
import styles from "./recording-template.module.css";

const options = { adaptiveStream: false, dynacast: false };

export function RecordingTemplate({
  url,
  token,
  initialLayout,
}: {
  url: string;
  token: string;
  initialLayout: RecordingLayout;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    EgressHelper.onLayoutChanged((value) => {
      if (value === "speaker" || value === "grid" || value === "screen")
        setLayout(value);
    });
    return () => {
      EgressHelper.onLayoutChanged(() => {});
    };
  }, []);
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      audio={false}
      video={false}
      options={options}
      onConnected={() => setConnected(true)}
      className={styles.room}
    >
      <RecordingStage layout={layout} connected={connected} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function RecordingStage({
  layout,
  connected,
}: {
  layout: RecordingLayout;
  connected: boolean;
}) {
  const room = useRoomContext();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );
  const speakers = useSpeakingParticipants();
  const cameras = tracks
    .filter(
      (track) =>
        track.source === Track.Source.Camera &&
        track.participant.kind !== ParticipantKind.EGRESS &&
        !track.participant.permissions?.hidden &&
        track.participant !== room.localParticipant,
    )
    .sort((a, b) =>
      a.participant.identity.localeCompare(b.participant.identity),
    );
  const screens = tracks
    .filter(
      (track) =>
        track.source === Track.Source.ScreenShare &&
        isTrackReference(track) &&
        !track.publication.isMuted,
    )
    .sort((a, b) =>
      a.participant.identity.localeCompare(b.participant.identity),
    );
  const [speakerId, setSpeakerId] = useState<string>();
  const candidate = speakers.find(
    (participant) => participant !== room.localParticipant,
  )?.identity;
  useEffect(() => {
    if (!candidate || candidate === speakerId) return;
    const timer = window.setTimeout(() => setSpeakerId(candidate), 1000);
    return () => window.clearTimeout(timer);
  }, [candidate, speakerId]);
  const started = useRef(false);
  useEffect(() => {
    if (!connected || started.current) return;
    // Let subscribed media render before Egress begins capturing the stage.
    const timer = window.setTimeout(() => {
      EgressHelper.setRoom(room);
      EgressHelper.startRecording();
      started.current = true;
    }, 1500);
    return () => {
      window.clearTimeout(timer);
      room.off(RoomEvent.Disconnected, EgressHelper.endRecording);
    };
  }, [connected, room]);
  const stage = selectRecordingStage(layout, cameras, screens, speakerId);
  const gallery = !stage.main && stage.tiles.length > 0;
  const overflow =
    cameras.length -
    (gallery
      ? stage.tiles.length
      : stage.tiles.length + (stage.main && !stage.screen ? 1 : 0));
  return (
    <main
      className={styles.stage}
      data-layout={layout}
      data-sharing={Boolean(screens.length)}
    >
      {stage.main ? (
        <section className={styles.main}>
          <RecordingTile track={stage.main} screen={stage.screen} />
        </section>
      ) : gallery ? null : (
        <section className={styles.main}>
          <div className={styles.empty}>
            {layout === "screen"
              ? "Waiting for a shared screen"
              : "Waiting for participants"}
          </div>
        </section>
      )}
      {stage.tiles.length > 0 && (
        <section
          className={gallery ? styles.gallery : styles.sidebar}
          style={
            gallery
              ? {
                  gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(stage.tiles.length))}, minmax(0, 1fr))`,
                }
              : undefined
          }
        >
          {stage.tiles.map((track) => (
            <RecordingTile key={track.participant.identity} track={track} />
          ))}
          {overflow > 0 && (
            <span className={styles.overflow}>+{overflow} participants</span>
          )}
        </section>
      )}
    </main>
  );
}

function RecordingTile({
  track,
  screen = false,
}: {
  track: TrackReferenceOrPlaceholder;
  screen?: boolean;
}) {
  const visible =
    isTrackReference(track) &&
    track.publication.isSubscribed &&
    !track.publication.isMuted;
  const name = track.participant.name || track.participant.identity;
  return (
    <div className={`${styles.tile} ${screen ? styles.screen : ""}`}>
      {visible ? (
        <VideoTrack trackRef={track} className={styles.video} />
      ) : (
        <span className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</span>
      )}
      <span className={styles.name}>
        {name}
        {screen ? " · Screen share" : ""}
      </span>
    </div>
  );
}
