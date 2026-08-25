export enum MeetingRoute {
  ROOT = 'api/meetings',
  INSTANT = 'instant',
  LIST = '',
  JOIN_BY_TOKEN = 'join/:joinToken',
  JOIN_REQUESTS = ':meetingId/join-requests',
  APPROVE_JOIN_REQUEST = ':meetingId/join-requests/:userId/approve',
  REJECT_JOIN_REQUEST = ':meetingId/join-requests/:userId/reject',
  ACCESS = ':meetingId/access',
}

export enum MeetingClientRoute {
  MEETINGS = 'meetings',
}

export enum MeetingSuccessMessage {
  CREATED = 'Meeting created successfully',
  LISTED = 'Meetings retrieved successfully',
  DETAILS_RETRIEVED = 'Meeting details retrieved successfully',
  JOIN_REQUESTED = 'Join request submitted successfully',
  JOINED = 'Joined meeting successfully',
  JOIN_REQUESTS_LISTED = 'Join requests retrieved successfully',
  JOIN_APPROVED = 'Join request approved successfully',
  JOIN_REJECTED = 'Join request rejected successfully',
  ACCESS_UPDATED = 'Meeting access updated successfully',
}

export enum MeetingErrorMessage {
  MISSING_USER_ID = 'Missing user id',
  MISSING_MEETING_ID = 'Missing meeting id',
  MISSING_JOIN_TOKEN = 'Missing join token',
  MEETING_NOT_FOUND = 'Meeting not found',
  MEETING_NOT_LIVE = 'Meeting is not live',
  HOST_REQUIRED = 'Only the meeting host can perform this action',
  REQUEST_NOT_FOUND = 'Join request not found',
  SELF_REVIEW_NOT_ALLOWED = 'Host is already in the meeting',
}

export enum MeetingDefault {
  ROOM_PREFIX = 'meeting',
}

export enum MeetingSocketRoomPrefix {
  HOST = 'meeting-host',
  USER = 'meeting-user',
}

export enum MeetingParticipantRoleValue {
  HOST = 'HOST',
  PARTICIPANT = 'PARTICIPANT',
}

export enum MeetingParticipantStatusValue {
  REQUESTED = 'REQUESTED',
  JOINED = 'JOINED',
  REJECTED = 'REJECTED',
}

export enum MeetingStatusValue {
  LIVE = 'LIVE',
}

export enum MeetingTypeValue {
  INSTANT = 'INSTANT',
}

export enum MeetingEventTypeValue {
  CREATED = 'CREATED',
  STARTED = 'STARTED',
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
}
