export const DOCUMENT_CHAT_SHARING = {
  MAX_RECIPIENTS: 5000,
  SUCCESS: 'Chat recipients can view this document',
  INHERITED_EDITOR_WARNING:
    'Some recipients already have Editor access through a parent folder. They will keep Editor access while this item stays there and retain Viewer access if it is moved out.',
  OWNER_REQUIRED:
    'Only the owner can grant document access to chat recipients.',
  PROJECT_ACCESS_REQUIRED:
    'Some channel members do not have access to this project. Share in a channel whose members all have project access.',
  RECIPIENT_UNAVAILABLE:
    'Some recipients could not be verified. No document access was granted. Please try again.',
} as const;
