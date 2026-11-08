export const CONVERSATION_AI_MESSAGES = {
  emptyQuestion: 'How can you help?',
  invalidAttachmentId: 'Invalid attachment ID.',
  invalidAttachmentRequest:
    'This document summary request is invalid or AI is unavailable.',
  rateLimited: 'Too many AI requests. Wait a minute, then try again.',
  interrupted:
    'The AI request was interrupted. Send a new @AI Bot message to try again.',
  attachmentUnavailable: 'This attachment is no longer available.',
  attachmentForbidden:
    "You don't have permission to read this attachment in this conversation.",
  unsupportedAttachment:
    'Only PDF, DOCX, TXT, and MD files up to 20 MiB can be summarized.',
  attachmentOutsideConversation:
    'This file is not an attachment of this conversation.',
} as const;
