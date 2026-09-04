export enum MeetingSocketStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum MEETING_SUCCESS_MESSAGES {
  INSTANT_CREATED = 'Instant meeting created successfully',
  JOINED = 'Meeting joined successfully',
  ACCESS_CHECKED = 'Meeting access checked successfully',
  SETTINGS_UPDATED = 'Meeting settings updated successfully',
  JOIN_REQUESTED = 'Meeting join request submitted successfully',
  JOIN_REQUESTS_LISTED = 'Meeting join requests listed successfully',
  JOIN_REQUEST_APPROVED = 'Meeting join request approved successfully',
  JOIN_REQUEST_DECLINED = 'Meeting join request declined successfully',
}

export enum MEETING_ERROR_MESSAGES {
  MISSING_USER_ID = 'Missing userId',
  MEETING_NOT_FOUND = 'Meeting not found',
  MEETING_NOT_LIVE = 'Meeting is not live',
  MEETING_JOIN_REQUIRES_APPROVAL = 'Meeting join requires host approval',
  MEETING_MODERATOR_REQUIRED = 'Only meeting hosts or co-hosts can perform this action',
  JOIN_REQUEST_NOT_FOUND = 'Meeting join request not found',
  LIVEKIT_NOT_CONFIGURED = 'LiveKit is not configured',
  INSTANT_CREATE_FAILED = 'Failed to create instant meeting',
}
