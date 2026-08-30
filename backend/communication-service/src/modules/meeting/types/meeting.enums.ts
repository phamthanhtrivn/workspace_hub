export enum MeetingClientRoute {
  MEETINGS = 'meetings',
}

export enum MeetingSuccessMessage {
  CREATED = 'Meeting created successfully',
  LISTED = 'Meetings retrieved successfully',
  DETAILS_RETRIEVED = 'Meeting details retrieved successfully',
  JOIN_REQUESTED = 'Join request submitted successfully',
  JOINED = 'Joined meeting successfully',
  LEFT = 'Left meeting successfully',
  ENDED = 'Meeting ended successfully',
  JOIN_REQUESTS_LISTED = 'Join requests retrieved successfully',
  PARTICIPANTS_LISTED = 'Meeting participants retrieved successfully',
  JOIN_APPROVED = 'Join request approved successfully',
  JOIN_REQUESTS_APPROVED = 'Join requests approved successfully',
  JOIN_REJECTED = 'Join request rejected successfully',
  PARTICIPANT_ROLE_UPDATED = 'Meeting participant role updated successfully',
  PARTICIPANT_REMOVED = 'Meeting participant removed successfully',
  ACCESS_UPDATED = 'Meeting access updated successfully',
  LIVEKIT_TOKEN_CREATED = 'Meeting LiveKit token created successfully',
}

export enum MeetingErrorMessage {
  MISSING_USER_ID = 'Missing user id',
  MISSING_MEETING_ID = 'Missing meeting id',
  MISSING_JOIN_TOKEN = 'Missing join token',
  MEETING_NOT_FOUND = 'Meeting not found',
  MEETING_NOT_LIVE = 'Meeting is not live',
  HOST_REQUIRED = 'Only the meeting host can perform this action',
  MODERATOR_REQUIRED = 'Only the meeting host or co-host can perform this action',
  REQUEST_NOT_FOUND = 'Join request not found',
  SELF_REVIEW_NOT_ALLOWED = 'Host is already in the meeting',
  PARTICIPANT_JOIN_REQUIRED = 'You must be approved to join this meeting',
  PARTICIPANT_NOT_FOUND = 'Meeting participant not found',
  PARTICIPANT_REMOVED = 'You were removed from this meeting',
  INVALID_PARTICIPANT_ROLE = 'Invalid meeting participant role',
  REMOVE_SELF_NOT_ALLOWED = 'You cannot remove yourself from the meeting',
  REMOVE_HOST_NOT_ALLOWED = 'You cannot remove the current meeting host',
  REMOVE_MODERATOR_NOT_ALLOWED = 'You cannot remove a meeting host or co-host',
}

export enum MeetingDefault {
  ROOM_PREFIX = 'meeting',
  LIVEKIT_TOKEN_TTL_SECONDS = 21600,
  LIST_PAGE_SIZE = 10,
  LIST_MAX_PAGE_SIZE = 50,
}

export enum MeetingSocketRoomPrefix {
  HOST = 'meeting-host',
  USER = 'meeting-user',
}

export enum MeetingParticipantRoleValue {
  HOST = 'HOST',
  COHOST = 'COHOST',
  PARTICIPANT = 'PARTICIPANT',
}

export enum MeetingParticipantStatusValue {
  REQUESTED = 'REQUESTED',
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
  REJECTED = 'REJECTED',
}

export enum MeetingStatusValue {
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}

export enum MeetingTypeValue {
  INSTANT = 'INSTANT',
}

export enum MeetingEventTypeValue {
  CREATED = 'CREATED',
  STARTED = 'STARTED',
  ENDED = 'ENDED',
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
}
