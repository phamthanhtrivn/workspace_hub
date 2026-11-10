"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { documentsApi } from "../api/documents.api";
import { DOCUMENT_QUERY_PARAMS } from "../types/documents.constants";
import { DocumentItemType } from "../types/documents.enums";
import { useAppSelector } from "@/store/store";
import { QueryFeedback } from "@/components/common/query-feedback";
import { Button } from "@/components/ui/button";
import FilePreviewModal from "./preview/file-preview-modal";

export function DocumentNotificationTarget() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = useAppSelector((state) => state.auth.userId);
  const documentId = params.get(DOCUMENT_QUERY_PARAMS.DOCUMENT_ID);
  const query = useQuery({
    queryKey: ["documents", "notification-target", userId, documentId],
    queryFn: () => documentsApi.getAccessibleItem(documentId!),
    enabled: !!userId && !!documentId,
    retry: false,
  });
  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete(DOCUMENT_QUERY_PARAMS.DOCUMENT_ID);
    router.replace(`/documents?${next.toString()}`, { scroll: false });
  };
  if (!documentId) return null;
  if (!query.data || query.error)
    return (
      <div className="border-b border-border bg-card p-4">
        <QueryFeedback
          label="shared file access"
          pending={query.isPending}
          error={!!query.error}
          retrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
        {query.error && (
          <Button variant="secondary" onClick={close}>
            Dismiss
          </Button>
        )}
      </div>
    );
  if (query.data.type !== DocumentItemType.FILE) return null;

  return <FilePreviewModal open item={query.data} onClose={close} />;
}
