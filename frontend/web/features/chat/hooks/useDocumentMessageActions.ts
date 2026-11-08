"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/store";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import type { ChatMetadataResponse } from "@/features/documents/types/documents.types";
import { getDocumentFolderUrl } from "@/features/documents/utils/document-navigation";
import { getSharedDocumentAccessCode } from "@/features/documents/utils/shared-document-access";
import { logActionError } from "@/lib/permission-feedback";
import {
  chatDocumentMetadataKey,
  METADATA_STALE_TIME,
} from "../types/document.constants";

export function useDocumentMessageActions(documentId: string) {
  const router = useRouter();
  const client = useQueryClient();
  const userId = useAppSelector((state) => state.auth.userId);
  const processing = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<unknown>(null);
  const options = {
    queryKey: chatDocumentMetadataKey(userId, documentId),
    queryFn: () => documentsApi.getChatMetadata(documentId),
    retry: false as const,
  };
  const query = useQuery({
    ...options,
    enabled: !!userId && !!documentId,
    staleTime: METADATA_STALE_TIME,
  });

  const runAction = async (
    action?: (metadata: ChatMetadataResponse) => void | Promise<void>,
  ) => {
    if (processing.current || !userId || !documentId) return;
    processing.current = true;
    setIsProcessing(true);
    try {
      // A cached Chat card must never authorize a later action.
      const fresh = await client.fetchQuery({ ...options, staleTime: 0 });
      setActionError(null);
      if (!fresh.hasPermission) {
        setPreviewDocumentId(null);

        return;
      }
      await action?.(fresh);
    } catch (error) {
      setPreviewDocumentId(null);
      setActionError(error);
      if (!getSharedDocumentAccessCode(error)) logActionError(error);
    } finally {
      processing.current = false;
      setIsProcessing(false);
    }
  };

  return {
    metadata: query.data,
    isLoading: query.isLoading,
    error: actionError ?? query.error,
    isProcessing,
    previewDocumentId,
    closePreview: () => setPreviewDocumentId(null),
    retry: () => runAction(),
    handlePreview: () =>
      runAction((fresh) => {
        if (fresh.type !== DocumentItemType.FOLDER)
          setPreviewDocumentId(fresh.id);
      }),
    handleOpenFolder: () =>
      runAction((fresh) => {
        if (fresh.type === DocumentItemType.FOLDER)
          router.push(getDocumentFolderUrl(fresh.id, fresh.userRole));
      }),
    handleDownload: () =>
      runAction(async (fresh) => {
        if (fresh.type === DocumentItemType.FOLDER) {
          await documentsApi.downloadFolderAsZip(fresh.id, fresh.name);
        } else {
          const url = await documentsApi.getDownloadUrl(fresh.id);
          const link = document.createElement("a");
          link.href = url;
          link.download = fresh.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }),
  };
}
