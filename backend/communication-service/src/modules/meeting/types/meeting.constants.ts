export const MESSAGE_UPDATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_HISTORY_LIMIT = 8;
export const MAX_HISTORY_LIMIT = 50;
export const PARTICIPANT_PREVIEW_LIMIT = 4;
export const DEFAULT_UPCOMING_LIMIT = 10;
export const MAX_UPCOMING_LIMIT = 50;
export const DEFAULT_MEETING_REMINDER_MINUTES = 10;
export const MAX_MEETING_INVITEE_COUNT = 100;

export const MEETING_CALENDAR_COLOR = '#2563eb';

export enum MeetingEndReason {
  HOST_ENDED = 'host_ended',
  LIVEKIT_ROOM_FINISHED = 'livekit_room_finished',
}

export enum MeetingScreenShareStopReason {
  STOPPED = 'stopped',
  INTERRUPTED = 'interrupted',
  DISABLED = 'disabled',
  PARTICIPANT_LEFT = 'participant_left',
  PARTICIPANT_REMOVED = 'participant_removed',
  MEETING_ENDED = 'meeting_ended',
}
