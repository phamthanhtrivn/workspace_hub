"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { store } from "@/store/store";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { documentsApi } from "../api/documents.api";
import { DocumentItemType } from "../types/documents.enums";
import { ORIGINAL_VERSION_ID } from "../types/documents.constants";
import type { DocumentItem } from "../types/documents.types";
import type {
  DocumentCopyBatch,
  DocumentCopyTarget,
  CopyDeliveryStatus,
} from "../types/document-copy.types";
import { DOCUMENT_COPY_MESSAGES } from "../types/document-copy.constants";
import { shareDocumentToChat } from "../utils/share-document-to-chat";

export function useDocumentCopyDelivery(
  item: DocumentItem | null,
  actorId: string | null,
  onSuccess: () => void,
) {
  const [batch, setBatch] = useState<DocumentCopyBatch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);

  const send = async (targets: DocumentCopyTarget[], introMessage: string) => {
    if (!item || !actorId || !targets.length || running.current) return;
    const assertCurrentActor = () => {
      if (store.getState().auth.userId !== actorId)
        throw new Error(DOCUMENT_COPY_MESSAGES.accountChanged);
    };
    running.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      assertCurrentActor();
      let snapshot = batch;
      if (!snapshot) {
        let sourceVersionId: string | undefined;
        const isFolder = item.type === DocumentItemType.FOLDER;
        if (!isFolder) {
          const versions = await documentsApi.getVersions(item.id);
          assertCurrentActor();
          const current = versions.find((version) => version.isCurrent);
          if (!current || current.id === ORIGINAL_VERSION_ID)
            throw new Error(DOCUMENT_COPY_MESSAGES.versionUnavailable);
          sourceVersionId = current.id;
        }
        snapshot = {
          documentId: item.id,
          actorId,
          introMessage: introMessage.trim(),
          isFolder,
          sourceVersionId,
          deliveries: targets.map((target) => ({
            ...target,
            status: "pending",
          })),
        };
        setBatch(snapshot);
      }
      if (snapshot.actorId !== actorId || snapshot.documentId !== item.id)
        throw new Error(DOCUMENT_COPY_MESSAGES.accountChanged);
      const update = (
        chatId: string,
        status: CopyDeliveryStatus,
        failure?: string,
      ) => {
        setBatch((previous) =>
          previous
            ? {
                ...previous,
                deliveries: previous.deliveries.map((delivery) =>
                  delivery.chatId === chatId
                    ? { ...delivery, status, error: failure }
                    : delivery,
                ),
              }
            : previous,
        );
      };
      let failed = 0;
      for (const target of snapshot.deliveries) {
        if (target.status === "sent") continue;
        assertCurrentActor();
        update(target.chatId, "sending");
        try {
          await shareDocumentToChat({
            documentId: snapshot.documentId,
            currentUserId: actorId,
            introMessage: snapshot.introMessage,
            isFolder: snapshot.isFolder,
            sourceVersionId: snapshot.sourceVersionId,
            target: { type: target.type, chatId: target.chatId },
            assertCurrentActor,
          });
          assertCurrentActor();
          update(target.chatId, "sent");
        } catch (cause) {
          assertCurrentActor();
          failed += 1;
          update(
            target.chatId,
            "failed",
            getActionErrorMessage(cause, DOCUMENT_COPY_MESSAGES.failed),
          );
        }
      }
      assertCurrentActor();
      if (!failed) {
        toast.success(DOCUMENT_COPY_MESSAGES.sent(snapshot.deliveries.length));
        onSuccess();
      }
    } catch (cause) {
      const fallback =
        cause instanceof Error &&
        (
          [
            DOCUMENT_COPY_MESSAGES.accountChanged,
            DOCUMENT_COPY_MESSAGES.versionUnavailable,
          ] as readonly string[]
        ).includes(cause.message)
          ? cause.message
          : DOCUMENT_COPY_MESSAGES.failed;
      setError(getActionErrorMessage(cause, fallback));
    } finally {
      running.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    batch,
    isSubmitting,
    error,
    send,
    configurationLocked: isSubmitting || !!batch,
  };
}
