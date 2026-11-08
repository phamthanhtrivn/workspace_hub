export const DOCUMENT_CHAT_SHARE_ERRORS = {
  TARGET_UNAVAILABLE:
    "Could not verify the chat recipients. Please select the conversation again.",
  SEND_NOT_ALLOWED: "You cannot send messages in this conversation.",
  PROJECT_CHANNEL_REQUIRED:
    "Project documents can only be shared in their project's channels.",
  SEND_FAILED:
    "The message could not be sent. Viewer access already granted is retained; please try again.",
} as const;

export const DOCUMENT_CHAT_SHARE_SUCCESS =
  "Document shared. Recipients have view access.";
