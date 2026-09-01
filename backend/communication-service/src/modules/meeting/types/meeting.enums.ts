export enum MeetingSocketStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum MEETING_SUCCESS_MESSAGES {
  INSTANT_CREATED = 'Instant meeting created successfully',
}

export enum MEETING_ERROR_MESSAGES {
  MISSING_USER_ID = 'Missing userId',
  LIVEKIT_NOT_CONFIGURED = 'LiveKit is not configured',
  INSTANT_CREATE_FAILED = 'Failed to create instant meeting',
}
