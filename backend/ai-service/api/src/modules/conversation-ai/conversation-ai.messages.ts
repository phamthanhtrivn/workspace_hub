export const CONVERSATION_AI_MESSAGES = {
  noReadableText:
    "This file has no readable text or OCR content. Try a document with a clearer text layer.",
  noEligibleHistory:
    "There are no eligible text messages to summarize in this conversation.",
  interrupted:
    "The AI request was interrupted before the answer could be delivered. Send a new @AI Bot message to try again.",
  failed:
    "AI could not complete this request. Send a new @AI Bot message in a few minutes to try again.",
  attachmentFailed:
    "Unable to summarize this document. Check that the file is readable and try again.",
} as const;
