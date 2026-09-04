export enum MeetingEvent {
  JOIN = 'meeting:join',
  LEAVE = 'meeting:leave',
  PARTICIPANT_JOINED = 'meeting:participant_joined',
  PARTICIPANT_LEFT = 'meeting:participant_left',
  STATUS_UPDATED = 'meeting:status_updated',
  JOIN_REQUESTED = 'meeting:join_requested',
  JOIN_REQUEST_UPDATED = 'meeting:join_request_updated',
  MESSAGE_SENT = 'meeting:message_sent',
  MESSAGE_UPDATED = 'meeting:message_updated',
  MESSAGE_READ = 'meeting:message_read',
}
