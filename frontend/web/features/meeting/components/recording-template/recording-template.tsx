"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  useSpeakingParticipants,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import EgressHelper from "@livekit/egress-sdk";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { RecordingTemplateLayout } from "../../types/meeting-recording.types";
import { selectRecordingStage } from "../../utils/recording-stage";
import { isRecordingParticipant } from "../../utils/recording-participants";
import { useRecordingSubscriptions } from "../../hooks/useRecordingSubscriptions";
import styles from "./recording-template.module.css";

const options = { adaptiveStream: { pixelDensity: 1 }, dynacast: false };
const connectOptions = { autoSubscribe: false };
const trackSources = [
  { source: Track.Source.Camera, withPlaceholder: true },
  { source: Track.Source.ScreenShare, withPlaceholder: false },
  { source: Track.Source.Microphone, withPlaceholder: false },
  { source: Track.Source.ScreenShareAudio, withPlaceholder: false },
  { source: Track.Source.Unknown, withPlaceholder: false },
];
const trackOptions = {
  onlySubscribed: false,
  updateOnlyOn: [
    RoomEvent.TrackMuted,
    RoomEvent.TrackUnmuted,
    RoomEvent.ParticipantPermissionsChanged,
    RoomEvent.ParticipantMetadataChanged,
    RoomEvent.ParticipantNameChanged,
  ],
};

export function RecordingTemplate({
  url,
  token,
  initialLayout,
}: {
  url: string;
  token: string;
  initialLayout: RecordingTemplateLayout;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    EgressHelper.onLayoutChanged((value) => {
      if (value === "speaker" || value === "grid" || value === "screen" || /^app:TR_[A-Za-z0-9]+$/.test(value))
        setLayout(value as RecordingTemplateLayout);
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
      connectOptions={connectOptions}
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
  layout: RecordingTemplateLayout;
  connected: boolean;
}) {
  const room = useRoomContext();
  const appCapture = layout.startsWith("app:");
  const tracks = useTracks(trackSources, trackOptions);
  const speakers = useSpeakingParticipants();
  const cameras = useMemo(
    () =>
      tracks
        .filter(
          (track) =>
            track.source === Track.Source.Camera &&
            isRecordingParticipant(track.participant),
        )
        .sort((a, b) =>
          a.participant.identity.localeCompare(b.participant.identity),
        ),
    [tracks],
  );
  const screens = useMemo(
    () =>
      (layout === "screen" ? tracks : [])
        .filter(
          (track) =>
            track.source === Track.Source.ScreenShare &&
            isRecordingParticipant(track.participant) &&
            isTrackReference(track) &&
            !track.publication.isMuted,
        )
        .sort((a, b) =>
          a.participant.identity.localeCompare(b.participant.identity),
        ),
    [tracks, layout],
  );
  const [speakerId, setSpeakerId] = useState<string>();
  const candidate =
    layout === "speaker"
      ? speakers.find(isRecordingParticipant)?.identity
      : undefined;
  useEffect(() => {
    if (!candidate || candidate === speakerId) return;
    const timer = window.setTimeout(() => setSpeakerId(candidate), 1000);
    return () => window.clearTimeout(timer);
  }, [candidate, speakerId]);
  const started = useRef(false);
  useEffect(() => {
    if (!connected || started.current) return;
    EgressHelper.setRoom(room);
    room.on(RoomEvent.Disconnected, EgressHelper.endRecording);
    let frame = 0;
    const timer = window.setInterval(() => {
      const videos = Array.from(document.querySelectorAll("video"));
      if ((appCapture || videos.length > 0) && !videos.some((video) => video.readyState >= 2)) return;
      window.clearInterval(timer);
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          EgressHelper.startRecording();
          started.current = true;
        });
      });
    }, 50);
    return () => {
      window.clearInterval(timer);
      window.cancelAnimationFrame(frame);
      room.off(RoomEvent.Disconnected, EgressHelper.endRecording);
    };
  }, [connected, room, appCapture]);
  const stage = useMemo(
    () => appCapture ? {
      main: tracks.find((track) => isTrackReference(track) && track.publication.trackSid === layout.slice(4) && isRecordingParticipant(track.participant)),
      tiles: [], screen: true,
    } : selectRecordingStage(layout as "speaker" | "grid" | "screen", cameras, screens, speakerId),
    [appCapture, tracks, layout, cameras, screens, speakerId],
  );
  useRecordingSubscriptions(
    tracks,
    stage.main,
    stage.tiles,
    layout === "screen" || appCapture,
  );
  const gallery = !stage.main && stage.tiles.length > 0;
  const overflow =
    cameras.length -
    (gallery
      ? stage.tiles.length
      : stage.tiles.length + (stage.main && !stage.screen ? 1 : 0));
  return (
    <main
      className={`${styles.stage} ${appCapture ? styles.appStage : ""}`}
      data-layout={layout}
      data-sharing={Boolean(stage.main && stage.screen)}
    >
      {stage.main ? (
        <section className={styles.main}>
          <RecordingTile track={stage.main} screen={stage.screen} appCapture={appCapture} />
        </section>
      ) : gallery ? null : (
        <section className={styles.main}>
          <div className={styles.empty}>
            {appCapture ? "Waiting for the meeting tab" : layout === "screen"
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
  appCapture = false,
}: {
  track: TrackReferenceOrPlaceholder;
  screen?: boolean;
  appCapture?: boolean;
}) {
  const visible =
    isTrackReference(track) &&
    track.publication.isSubscribed &&
    !track.publication.isMuted;
  const name = track.participant.name || track.participant.identity;
  return (
    <div className={`${styles.tile} ${screen ? styles.screen : ""}`}>
      {isTrackReference(track) && !track.publication.isMuted && (
        <VideoTrack
          trackRef={track}
          manageSubscription={false}
          className={styles.video}
        />
      )}
      {!visible && (
        <span className={styles.avatar} style={{ position: "absolute" }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      {!appCapture && <span className={styles.name}>
        {name}
        {screen ? " · Screen share" : ""}
      </span>}
    </div>
  );
}
