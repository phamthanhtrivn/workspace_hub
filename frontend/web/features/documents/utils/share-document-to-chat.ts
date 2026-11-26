import { sendDirectMessage } from "@/features/chat/api/direct-message.api";
import { isAxiosError } from "axios";
import { sendChannelMessage } from "@/features/chat/api/channel.api";
import { copyDocumentsToChat } from "@/features/chat/api/document-attachment.api";
import { ChatContextType } from "@/features/chat/types/chat.types";
import { sendMeetingMessage } from "@/features/meeting/api/meeting.api";
import { attachTaskDocuments } from "@/features/project/api/task.api";
import { TaskDocumentAttachmentSource } from "@/features/project/types/project";
import { documentsApi } from "../api/documents.api";
import { fileCopyApi } from "../api/file-copy.api";
import { getDocumentChatShareAttempt } from "./document-chat-share-attempt";
import { ORIGINAL_VERSION_ID } from "../types/documents.constants";
import { DOCUMENT_COPY_MESSAGES } from "../types/document-copy.constants";
export interface DocumentChatShareTarget {
  type: "channel" | "direct" | "meeting" | "project";
  chatId: string;
  joinToken?: string;
  taskId?: string;
}
export async function shareDocumentToChat({
  documentId,
  target,
  currentUserId,
  introMessage,
  isFolder = false,
  assertCurrentActor = () => {},
  sourceVersionId,
}: {
  documentId: string;
  target: DocumentChatShareTarget;
  currentUserId: string;
  introMessage: string;
  isFolder?: boolean;
  assertCurrentActor?: () => void;
  sourceVersionId?: string;
}) {
  assertCurrentActor();
  if (target.type === "project" && isFolder)
    throw new Error("Choose individual files for Project Documents.");
  const progress = await getDocumentChatShareAttempt(currentUserId, [
    "COPY_V2",
    documentId,
    target.type,
    target.chatId,
    target.taskId,
    introMessage.trim(),
    ...(sourceVersionId ? [sourceVersionId] : []),
  ]);
  if (!isFolder && !progress.attempt.sourceVersionId) {
    if (sourceVersionId) {
      progress.attempt.sourceVersionId = sourceVersionId;
    } else {
      const versions = await documentsApi.getVersions(documentId);
      assertCurrentActor();
      const current = versions.find((version) => version.isCurrent);
      if (!current || current.id === ORIGINAL_VERSION_ID)
        throw new Error(DOCUMENT_COPY_MESSAGES.versionUnavailable);
      progress.attempt.sourceVersionId = current.id;
    }
  }
  progress.save();
  const files = [
    { id: documentId, versionId: progress.attempt.sourceVersionId },
  ];
  const resetPreparation = (error: unknown) => {
    if (
      isAxiosError(error) &&
      [410, 412].includes(error.response?.status ?? 0)
    ) {
      assertCurrentActor();
      progress.attempt.documentRequestId = crypto.randomUUID();
      if (error.response?.status === 412)
        delete progress.attempt.sourceVersionId;
      progress.save();
    }
  };
  if (target.type === "project") {
    const copied = await fileCopyApi
      .project(target.chatId, files, progress.attempt.documentRequestId)
      .catch((error) => {
        resetPreparation(error);
        throw error;
      });
    assertCurrentActor();
    if (target.taskId)
      await attachTaskDocuments(target.taskId, {
        documentItemIds: copied.map((file) => file.id),
        source: TaskDocumentAttachmentSource.PROJECT_DOCUMENT,
        operationId: progress.attempt.documentRequestId,
      });
    assertCurrentActor();
    progress.complete();

    return;
  }
  const chatType =
    target.type === "channel"
      ? ChatContextType.CHANNEL
      : target.type === "direct"
        ? ChatContextType.DIRECT_MESSAGE
        : ChatContextType.MEETING;
  let copies: Awaited<ReturnType<typeof copyDocumentsToChat>>;
  try {
    copies = await copyDocumentsToChat(
      files,
      { chatId: target.chatId, chatType },
      new AbortController().signal,
      progress.attempt.documentRequestId,
    );
  } catch (error) {
    resetPreparation(error);
    throw error;
  }
  assertCurrentActor();
  const send = async (
    content: string,
    requestId: string,
    attachment = false,
  ) => {
    assertCurrentActor();
    const payload = {
      content,
      clientRequestId: requestId,
      ...(attachment ? { medias: copies } : {}),
    };
    if (target.type === "meeting") {
      if (!target.joinToken) throw new Error("Select the meeting again.");
      const response = await sendMeetingMessage(target.joinToken, payload);
      if (!response.success)
        throw new Error("Unable to send the attachment. Retry this operation.");
    } else {
      const response = await (
        target.type === "channel" ? sendChannelMessage : sendDirectMessage
      )(target.chatId, { ...payload, type: "TEXT" });
      if (!response.success)
        throw new Error("Unable to send the attachment. Retry this operation.");
    }
  };
  if (introMessage.trim() && !progress.attempt.introSent) {
    await send(introMessage.trim(), progress.attempt.introRequestId);
    progress.attempt.introSent = true;
    progress.save();
  }
  assertCurrentActor();
  await send("", progress.attempt.documentRequestId, true);
  assertCurrentActor();
  progress.complete();
}
