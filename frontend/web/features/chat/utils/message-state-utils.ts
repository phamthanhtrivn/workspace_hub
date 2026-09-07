import { ChatMessageResponse } from "../types/chat.types";

export function upsertMessageById(
  messages: ChatMessageResponse[],
  incomingMessage: ChatMessageResponse,
) {
  const existingIndex = messages.findIndex(
    (message) => message.id === incomingMessage.id,
  );

  if (existingIndex === -1) {
    return [...messages, incomingMessage];
  }

  return messages.map((message, index) =>
    index === existingIndex ? { ...message, ...incomingMessage } : message,
  );
}
