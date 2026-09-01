export enum POLL_SUCCESS_MESSAGES {
  RETRIEVED = 'Polls retrieved successfully',
  VOTED = 'Vote submitted successfully',
  OPTION_ADDED = 'Poll option added successfully',
  UPDATED = 'Poll updated successfully',
}

export enum POLL_ERROR_MESSAGES {
  NOT_FOUND = 'Poll not found',
  OPTION_NOT_FOUND = 'Poll option not found',
  ADD_OPTION_PREVENTED = 'Adding options is not allowed',
  EDIT_ACCESS_DENIED = 'Only the creator can edit this poll',
  LOCKED = 'Poll is locked',
  MISSING_USER_OR_CHANNEL_ID = 'Missing userId or channelId',
  MISSING_REQUIRED_DATA = 'Missing required poll data',
  NOT_MEMBER_OF_CHANNEL = 'You are not a member of this channel',
}
