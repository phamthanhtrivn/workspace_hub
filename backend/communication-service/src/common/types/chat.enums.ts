export enum CHAT_RESPONSE_STATUS {
  SUCCESS = 'success',
  ERROR = 'error',
  JOINED = 'joined',
}

export enum CHAT_CONTEXT_TYPE {
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  CHANNEL = 'CHANNEL',
}

export enum CHAT_REACTION_ACTION {
  ADD = 'add',
  REMOVE = 'remove',
}

export enum CHAT_ERROR_MESSAGES {
  INVALID_DATA = 'Invalid data',
  SEND_FAILED = 'Failed to send message',
  SYSTEM_SEND_FAILED = 'Failed to send system message',
  REACTION_FAILED = 'Failed to update reaction',
  POLL_VOTE_FAILED = 'Failed to vote poll',
  POLL_ADD_OPTION_FAILED = 'Failed to add poll option',
  POLL_EDIT_FAILED = 'Failed to edit poll',
  NOTE_EDIT_FAILED = 'Failed to edit note',
  MESSAGE_EDIT_FAILED = 'Failed to edit message',
  MESSAGE_RECALL_FAILED = 'Failed to recall message',
  READ_RECEIPT_FAILED = 'Failed to mark as read',
  PIN_FAILED = 'Failed to pin message',
  UNPIN_FAILED = 'Failed to unpin message',
}
