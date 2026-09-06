import { TrackSource } from "livekit-server-sdk";

export const BASE_PUBLISH_SOURCES = [
  TrackSource.CAMERA,
  TrackSource.MICROPHONE,
] as const;

export const SCREEN_SHARE_PUBLISH_SOURCES = [
  ...BASE_PUBLISH_SOURCES,
  TrackSource.SCREEN_SHARE,
  TrackSource.SCREEN_SHARE_AUDIO,
] as const;