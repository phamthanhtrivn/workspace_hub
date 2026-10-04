export const DIRECT_MESSAGE_PERMISSION_REASON = {
  RECIPIENT_BLOCKS_NEW_DM: 'RECIPIENT_BLOCKS_NEW_DM',
} as const;

export const DIRECT_MESSAGE_PERMISSION_MESSAGES = {
  NOT_PARTICIPANT: 'You are not a member of this direct conversation.',
  RECIPIENT_BLOCKS_NEW_DM: 'This person is not accepting new direct messages.',
  UNAVAILABLE: 'Unable to check direct message permission right now.',
} as const;
