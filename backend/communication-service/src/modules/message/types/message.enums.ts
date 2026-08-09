export enum MESSAGE_DIRECTION {
  OLDER = 'older',
  NEWER = 'newer',
  AROUND = 'around',
}

export enum THREAD_FOLLOW_LABEL {
  FOLLOWING = 'Thread followed',
  UN_FOLLOWING = 'Thread unfollowed',
}

export enum MESSAGE_CONSTANTS {
  DEFAULT_LIMIT = 20,
}

export enum MESSAGE_SUCCESS_MESSAGES {
  CREATED = 'Message created successfully',
  UPDATED = 'Message updated successfully',
  DELETED = 'Message deleted successfully',
  RECALLED = 'Message recalled successfully',
  PINNED = 'Message pinned successfully',
  UNPINNED = 'Message unpinned successfully',
  REACTION_UPDATED = 'Reaction updated successfully',
  READ_RECEIPT_UPDATED = 'Read receipt updated successfully',
  THREAD_FOLLOW_UPDATED = 'Thread follow status updated successfully',
  HISTORY_RETRIEVED = 'Message history retrieved successfully',
  MEDIA_RETRIEVED = 'Media retrieved successfully',
  PINNED_RETRIEVED = 'Pinned messages retrieved successfully',
  SEARCH_COMPLETED = 'Message search completed successfully',
  THREAD_RETRIEVED = 'Thread messages retrieved successfully',
  THREADS_LISTED = 'Threads retrieved successfully',
}

export enum MESSAGE_ERROR_MESSAGES {
  NOT_MEMBER_OF_CONVERSATION = 'You are not a member of this conversation',
  NOT_MEMBER_OF_CHANNEL = 'You are not a member of this channel',
  NOT_MEMBER_OF_SPACE = 'You are not a member of this space',
  MESSAGE_DISABLED = 'Messaging is disabled in this channel',
  POLL_DISABLED = 'Poll creation is disabled in this channel',
  NOTE_DISABLED = 'Note creation is disabled in this channel',
  PARENT_NOT_FOUND = 'Thread parent message does not exist',
  MESSAGE_NOT_FOUND = 'Message not found',
  ROOT_THREAD_NOT_FOUND = 'Thread root message not found',
  PIN_DISABLED = 'Message pinning is disabled in this channel',
  ALREADY_PINNED = 'Message is already pinned',
  NOT_PINNED = 'Message is not pinned',
  NOT_MEMBER_OF_GROUP = 'You are not a member of this group',
  NOT_FOUND_SIMPLE = 'Message not found',
  MISSING_CHANNEL_ID = 'Missing channelId',
  MISSING_MESSAGE_ID = 'Missing messageId',
  MISSING_USER_ID = 'Missing userId',
  INVALID_DATA = 'Invalid data',
}
