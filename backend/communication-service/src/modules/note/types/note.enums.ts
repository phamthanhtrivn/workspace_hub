export enum NOTE_SUCCESS_MESSAGES {
  RETRIEVED = 'Notes retrieved successfully',
  UPDATED = 'Note updated successfully',
}

export enum NOTE_ERROR_MESSAGES {
  NOT_FOUND = 'Note not found',
  EDIT_ACCESS_DENIED = 'Only the creator can edit this note',
  MISSING_USER_OR_CHANNEL_ID = 'Missing userId or channelId',
  MISSING_REQUIRED_DATA = 'Missing required note data',
  NOT_MEMBER_OF_CHANNEL = 'You are not a member of this channel',
}
