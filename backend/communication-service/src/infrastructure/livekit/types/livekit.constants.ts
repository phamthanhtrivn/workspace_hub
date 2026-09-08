import { TrackSource } from 'livekit-server-sdk';

export const LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS = 60 * 60;
export const LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS = 60 * 60;

export enum LiveKitWebhookEvent {
  ROOM_FINISHED = 'room_finished',
}

export const BASE_PUBLISH_SOURCES = [
  TrackSource.CAMERA,
  TrackSource.MICROPHONE,
] as const;

export const SCREEN_SHARE_PUBLISH_SOURCES = [
  ...BASE_PUBLISH_SOURCES,
  TrackSource.SCREEN_SHARE,
  TrackSource.SCREEN_SHARE_AUDIO,
] as const;
