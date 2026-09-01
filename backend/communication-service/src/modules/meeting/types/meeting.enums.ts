export enum MeetingSocketStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum MEETING_SUCCESS_MESSAGES {
  INSTANT_CREATED = 'Instant meeting created successfully',
  JOINED = 'Meeting joined successfully',
}

export enum MEETING_ERROR_MESSAGES {
  MISSING_USER_ID = 'Missing userId',
  MEETING_NOT_FOUND = 'Meeting not found',
  MEETING_NOT_LIVE = 'Meeting is not live',
  MEETING_JOIN_REQUIRES_APPROVAL = 'Meeting join requires host approval',
  LIVEKIT_NOT_CONFIGURED = 'LiveKit is not configured',
  INSTANT_CREATE_FAILED = 'Failed to create instant meeting',
}
