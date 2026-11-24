import type { DirectMessage } from "@/features/chat/types/chat.types";
import type { DirectCopyRecipient } from "../types/document-copy.types";

export function getDirectCopyRecipients(
  conversations: DirectMessage[],
  actorId: string,
): DirectCopyRecipient[] {
  return conversations.flatMap((conversation) => {
    const members = conversation.members?.length
      ? conversation.members
      : (conversation.participants ?? []);
    if (!members.some((member) => member.userId === actorId)) return [];
    const peer = members.find((member) => member.userId !== actorId);
    if (!peer) return [];
    const profile = peer.profile;

    return [
      {
        conversationId: conversation.id,
        userId: peer.userId,
        name:
          profile?.fullName?.trim() ||
          peer.nickname?.trim() ||
          profile?.email ||
          "Direct message",
        email: profile?.email ?? "",
        nickname: peer.nickname ?? "",
        avatarUrl: profile?.avatarUrl ?? null,
      },
    ];
  });
}

export function matchesCopySearch(
  query: string,
  ...values: (string | null | undefined)[]
): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d");
  const search = normalize(query.trim());

  return (
    !search || values.some((value) => normalize(value ?? "").includes(search))
  );
}
