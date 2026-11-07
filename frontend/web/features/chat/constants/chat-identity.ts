export const AI_BOT = {
  id: "00000000-0000-4000-8000-0000000000a1",
  mentionId: "ai",
  name: "AI Bot",
  mention: "@AI Bot",
} as const;

export function isAiBot(senderId?: string | null, type?: string | null) {
  return senderId === AI_BOT.id || type === "AI";
}
