export const CHAT_GROUP_MENTION = {
  all: { id: "all", name: "All" },
  channel: { id: "channel", name: "Channel" },
} as const;

export type ChatGroupMention = keyof typeof CHAT_GROUP_MENTION;
