"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/store";
import {
  useSpacesQuery,
  useSpaceChannelsQuery,
  useDirectMessagesQuery,
} from "@/features/chat/hooks/useChatQueries";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import type { DocumentItem } from "../types/documents.types";
import type {
  DocumentCopyTab,
  DocumentCopyTarget,
} from "../types/document-copy.types";
import { DOCUMENT_COPY_MESSAGES } from "../types/document-copy.constants";
import { getDirectCopyRecipients } from "../utils/document-copy-recipients";
import { useDocumentCopyDelivery } from "./use-document-copy-delivery";

export function useShareToChat({
  item,
  onSuccess,
  enabled = true,
}: {
  item: DocumentItem | null;
  onSuccess: () => void;
  projectId?: string;
  enabled?: boolean;
}) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [initialActor] = useState(currentUserId);
  const actorChanged = currentUserId !== initialActor;
  const actor = enabled && item && !actorChanged ? currentUserId : null;
  const [activeTab, setActiveTab] = useState<DocumentCopyTab>("channel");
  const [chosenSpaceId, setChosenSpaceId] = useState("");
  const [chosenChannelId, setChosenChannelId] = useState("");
  const [selectedDirectIds, setSelectedDirectIds] = useState<string[]>([]);
  const [introMessage, setIntroMessage] = useState("");
  const delivery = useDocumentCopyDelivery(item, actor, onSuccess);
  const locked = actorChanged || delivery.configurationLocked;
  const spacesQuery = useSpacesQuery(activeTab === "channel" ? actor : null);
  const spaces = spacesQuery.data ?? [];
  const selectedSpaceId = spaces.some((space) => space.id === chosenSpaceId)
    ? chosenSpaceId
    : (spaces[0]?.id ?? "");
  const channelsQuery = useSpaceChannelsQuery(selectedSpaceId, undefined, {
    enabled: !!actor && activeTab === "channel" && !!selectedSpaceId,
  });
  const channels = (channelsQuery.data?.channels ?? []).filter((channel) => {
    const member = channel.members?.find((member) => member.userId === actor);

    return (
      !!member &&
      (member.role !== SpaceRole.MEMBER ||
        channel.setting?.allowSendMessage !== false)
    );
  });
  const selectedChannel = channels.find(
    (channel) => channel.id === chosenChannelId,
  );
  const directQuery = useDirectMessagesQuery(
    activeTab === "direct" ? actor : null,
  );
  const directRecipients = useMemo(
    () =>
      actor
        ? getDirectCopyRecipients(directQuery.data?.directMessages ?? [], actor)
        : [],
    [actor, directQuery.data],
  );
  const selectedRecipients = directRecipients.filter((recipient) =>
    selectedDirectIds.includes(recipient.conversationId),
  );
  const targets: DocumentCopyTarget[] =
    activeTab === "channel"
      ? selectedChannel
        ? [
            {
              type: "channel",
              chatId: selectedChannel.id,
              label: `#${selectedChannel.name}`,
            },
          ]
        : []
      : selectedRecipients.map((recipient) => ({
          type: "direct",
          chatId: recipient.conversationId,
          label: recipient.name,
        }));
  const targetError =
    activeTab === "direct"
      ? directQuery.isError
      : spacesQuery.isError || channelsQuery.isError;
  const targetsLoading =
    activeTab === "direct"
      ? directQuery.isLoading
      : spacesQuery.isLoading || (!!selectedSpaceId && channelsQuery.isLoading);
  const failedCount =
    delivery.batch?.deliveries.filter((target) => target.status === "failed")
      .length ?? 0;
  const changeTab = (tab: DocumentCopyTab) => {
    if (!locked && (tab === "channel" || tab === "direct")) setActiveTab(tab);
  };
  const setSelectedSpaceId = (id: string) => {
    if (!locked) {
      setChosenSpaceId(id);
      setChosenChannelId("");
    }
  };
  const setSelectedChannelId = (id: string) => {
    if (!locked) setChosenChannelId(id);
  };
  const toggleDirect = (id: string) => {
    if (
      locked ||
      !directRecipients.some((recipient) => recipient.conversationId === id)
    )
      return;
    setSelectedDirectIds((previous) =>
      previous.includes(id)
        ? previous.filter((selected) => selected !== id)
        : [...previous, id],
    );
  };
  const retryTargets = () =>
    activeTab === "direct"
      ? directQuery.refetch()
      : Promise.allSettled([spacesQuery.refetch(), channelsQuery.refetch()]);

  return {
    activeTab,
    changeTab,
    selectedSpaceId,
    setSelectedSpaceId,
    selectedChannelId: selectedChannel?.id ?? "",
    setSelectedChannelId,
    spaces,
    channels,
    directRecipients,
    selectedRecipients,
    toggleDirect,
    introMessage,
    setIntroMessage: (message: string) => {
      if (!locked) setIntroMessage(message);
    },
    locked,
    isSubmitting: delivery.isSubmitting,
    batch: delivery.batch,
    error: actorChanged
      ? DOCUMENT_COPY_MESSAGES.accountChanged
      : delivery.error,
    failedCount,
    targetError,
    targetsLoading,
    retryTargets,
    canSubmit:
      !actorChanged &&
      !delivery.isSubmitting &&
      (delivery.batch
        ? failedCount > 0
        : targets.length > 0 && !targetError && !targetsLoading),
    selectedCount: delivery.batch?.deliveries.length ?? targets.length,
    handleShare: () =>
      delivery.send(delivery.batch?.deliveries ?? targets, introMessage),
  };
}
