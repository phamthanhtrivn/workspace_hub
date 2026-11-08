export const DOCUMENT_CHAT_SHARING = {
  MAX_RECIPIENTS: 5000,
  SUCCESS: 'Chat recipients can view this document',
  OWNER_REQUIRED:
    'Only the owner can grant document access to chat recipients.',
  PROJECT_ACCESS_REQUIRED:
    'Some channel members do not have access to this project. Share in a channel whose members all have project access.',
  RECIPIENT_UNAVAILABLE:
    'Some recipients could not be verified. No document access was granted. Please try again.',
} as const;
