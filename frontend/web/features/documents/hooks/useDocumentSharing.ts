"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { SharePermission } from "../types/documents.enums";
import { toast } from "sonner";

export function useDocumentSharing(documentId: string | null) {
  const queryClient = useQueryClient();

  const { data: shareData, isLoading, error } = useQuery({
    queryKey: ["document-shares", documentId],
    queryFn: () => (documentId ? documentsApi.getSharing(documentId) : null),
    enabled: !!documentId,
  });

  const removeShareMutation = useMutation({
    mutationFn: (shareId: string) =>
      documentId
        ? documentsApi.removeShare(documentId, shareId)
        : Promise.reject("No document selected"),
    onSuccess: () => {
      toast.success("Access revoked");
      queryClient.invalidateQueries({ queryKey: ["document-shares", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to revoke access");
    },
  });

  const shareWithUserMutation = useMutation({
    mutationFn: ({ email, permission }: { email: string; permission: SharePermission | string }) =>
      documentId
        ? documentsApi.addShare(documentId, email, permission)
        : Promise.reject("No document selected"),
    onSuccess: () => {
      toast.success("Document shared successfully");
      queryClient.invalidateQueries({ queryKey: ["document-shares", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to share document");
    },
  });

  return {
    shareDetails: shareData,
    isLoadingSharing: isLoading,
    shareError: error,

    removeShare: removeShareMutation.mutateAsync,
    isRemovingShare: removeShareMutation.isPending,

    shareWithUser: shareWithUserMutation.mutateAsync,
    isSharing: shareWithUserMutation.isPending,
  };
}
