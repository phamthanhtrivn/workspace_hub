export enum ChatEvent {
  JOIN_CONVERSATION = 'join_conversation',
  LEAVE_CONVERSATION = 'leave_conversation',
  SEND_MESSAGE = 'send_message',
  NEW_MESSAGE = 'new_message',
  GROUP_INVITATION = 'group_invitation',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_DECLINED = 'invitation_declined',
  MEDIA_UPDATED = 'media_updated',
  POLL_UPDATED = 'poll_updated',
  VOTE_POLL = 'vote_poll',
  ADD_POLL_OPTION = 'add_poll_option',
  EDIT_POLL = 'edit_poll',
  MESSAGE_MOVED = 'message_moved',
  NOTE_UPDATED = 'note_updated',
  EDIT_NOTE = 'edit_note',
  REACT_MESSAGE = 'react_message',
  REACTION_UPDATED = 'reaction_updated',
  READ_MESSAGE = 'read_message',
  MESSAGE_READ = 'message_read',
  EDIT_MESSAGE = 'edit_message',
  RECALL_MESSAGE = 'recall_message',
  MESSAGE_UPDATED = 'message_updated',
  TYPING = 'typing',
  PIN_MESSAGE = 'pin_message',
  UNPIN_MESSAGE = 'unpin_message',
  MESSAGE_PINNED = 'message_pinned',
  MESSAGE_UNPINNED = 'message_unpinned',
  GROUP_SETTING_UPDATED = 'group_setting_updated',
  MEMBER_ROLE_UPDATED = 'member_role_updated',
  MEMBER_KICKED = 'member_kicked',
  MEMBER_LEFT = 'member_left',
  CONVERSATION_DISBANDED = 'conversation_disbanded',
  CONVERSATION_UPDATED = 'CONVERSATION_UPDATED',
  CONVERSATION_MUTE_UPDATED = 'conversation_mute_updated',
}

export enum CHAT_RESPONSE_STATUS {
  SUCCESS = 'success',
  ERROR = 'error',
  JOINED = 'joined',
}

export enum CHAT_REACTION_ACTION {
  ADD = 'add',
  REMOVE = 'remove',
}

export enum CHAT_MENTION {
  ALL = 'all',
}

export enum CHAT_PREVIEW_TEXT {
  POLL_PREFIX = 'Created a poll: ',
  NOTE_PREFIX = 'Created a note: ',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'attachment',
  SENT_ATTACHMENT_PREFIX = 'Sent an ',
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
