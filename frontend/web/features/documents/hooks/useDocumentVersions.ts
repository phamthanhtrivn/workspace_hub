"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { toast } from "sonner";
import { useDownloadQueue } from "../components/download/download-queue-provider";

export function useDocumentVersions(documentId: string | null) {
  const queryClient = useQueryClient();
  const { enqueueDownload } = useDownloadQueue();

  const { data: versionHistory, isLoading, error } = useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: () => (documentId ? documentsApi.getVersions(documentId) : null),
    enabled: !!documentId,
  });

  const uploadVersionMutation = useMutation({
    mutationFn: ({ file }: { file: File }) =>
      documentId
        ? documentsApi.uploadNewVersion(documentId, file)
        : Promise.reject("No document selected"),
    onSuccess: () => {
      toast.success("New version uploaded");
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to upload version");
    },
  });

  const handleDownloadVersion = async (versionId: string, fileName: string) => {
    if (!documentId) return;
    try {
      const downloadUrl = await documentsApi.getDownloadUrl(documentId, versionId);
      const link = document.createElement("a");
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info(`Downloading version...`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download version");
    }
  };

  return {
    versionHistory,
    isLoadingVersions: isLoading,
    versionError: error,

    uploadVersion: uploadVersionMutation.mutateAsync,
    isUploadingVersion: uploadVersionMutation.isPending,

    downloadVersion: handleDownloadVersion,
  };
}
