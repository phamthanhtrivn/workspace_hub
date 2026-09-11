import { MeetingMessageResponse } from "../types/meeting.types";

export function upsertMeetingMessage(
  messages: MeetingMessageResponse[],
  message: MeetingMessageResponse,
) {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) return [...messages, message];

  return messages.map((item) => (item.id === message.id ? message : item));
}