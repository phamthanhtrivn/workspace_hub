"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { documentsApi } from "../../api/documents.api";
import type {
  DocumentItem,
  DocumentVersion,
} from "../../types/documents.types";
import { VERSION_MESSAGES } from "../../types/document-version.constants";
import { invalidateDocumentVersion } from "../../utils/document-cache";
import { DocumentsConfirmDialog } from "../ui/documents-confirm-dialog";

interface VersionDeleteDialogProps {
  item: DocumentItem;
  version: DocumentVersion;
  isPublic: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function VersionDeleteDialog({
  item,
  version,
  isPublic,
  onClose,
  onDeleted,
}: VersionDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deletion = useMutation({
    mutationFn: () => documentsApi.deleteVersion(item.id, version.id, isPublic),
    onSuccess: () => {
      void invalidateDocumentVersion(queryClient, item.id);
      void queryClient.invalidateQueries({ queryKey: ["document-quota"] });
      onClose();
      onDeleted?.();
      toast.success(VERSION_MESSAGES.deleteSaved);
    },
    onError: (error) =>
      toast.error(getActionErrorMessage(error, VERSION_MESSAGES.deleteFailed)),
  });

  return (
    <DocumentsConfirmDialog
      open
      title={VERSION_MESSAGES.deleteTitle(version.versionNumber)}
      description={VERSION_MESSAGES.deleteDescription(item.name)}
      confirmLabel="Delete permanently"
      cancelLabel="Cancel"
      variant="danger"
      isLoading={deletion.isPending}
      onConfirm={() => deletion.mutate()}
      onCancel={() => {
        if (!deletion.isPending) onClose();
      }}
    />
  );
}
