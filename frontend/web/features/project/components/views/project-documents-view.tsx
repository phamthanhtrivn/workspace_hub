"use client";

import { useEffect, useState } from "react";
import DocumentExplorer from "@/features/documents/components/document-explorer";
import { DownloadQueueProvider } from "@/features/documents/components/download/download-queue-provider";
import { DocumentsEmptyState } from "@/features/documents/components/ui/documents-empty-state";
import { DocumentsLoadingState } from "@/features/documents/components/ui/documents-loading-state";
import { DocumentViewType } from "@/features/documents/types/documents.enums";
import { useProjectDocuments } from "@/features/project/hooks/use-projects";

interface ProjectDocumentsViewProps {
  projectId: string;
  projectName: string;
  canEditDocuments: boolean;
}

export default function ProjectDocumentsView({
  projectId,
  projectName,
  canEditDocuments,
}: ProjectDocumentsViewProps) {
  const documentsQuery = useProjectDocuments(projectId);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([]);

  useEffect(() => {
    if (!documentsQuery.data) return;
    setCurrentFolderId(documentsQuery.data.folderId);
    setPath([{ id: documentsQuery.data.folderId, name: projectName }]);
  }, [documentsQuery.data, projectName]);

  const handleNavigate = (folderId: string | null, folderName?: string) => {
    const rootFolderId = documentsQuery.data?.folderId ?? null;
    if (!folderId) {
      setCurrentFolderId(rootFolderId);
      setPath(rootFolderId ? [{ id: rootFolderId, name: projectName }] : []);
      return;
    }

    setCurrentFolderId(folderId);
    if (!folderName) return;

    setPath((currentPath) => {
      const existingIndex = currentPath.findIndex((item) => item.id === folderId);
      if (existingIndex >= 0) {
        return currentPath.slice(0, existingIndex + 1);
      }
      return [...currentPath, { id: folderId, name: folderName }];
    });
  };

  if (documentsQuery.isLoading) {
    return (
      <div className="h-full min-h-0 rounded-lg border border-border bg-card p-6">
        <DocumentsLoadingState view="grid" />
      </div>
    );
  }

  if (documentsQuery.isError || !documentsQuery.data) {
    return (
      <div className="h-full min-h-0 rounded-lg border border-border bg-card p-6">
        <DocumentsEmptyState
          title="Unable to open project documents"
          description="Project documents are not available right now"
        />
      </div>
    );
  }

  return (
    <DownloadQueueProvider>
      <div className="h-full min-h-0 min-w-0 overflow-hidden rounded-lg border border-border bg-card">
        <DocumentExplorer
          currentFolderId={currentFolderId}
          onNavigate={handleNavigate}
          activeView={DocumentViewType.MY_FILES}
          path={path}
          setPath={setPath}
          projectId={projectId}
          canEditDocuments={canEditDocuments}
          accessErrorTitle="Project documents are private"
          accessErrorDescription="You do not have access to these project documents yet"
        />
      </div>
    </DownloadQueueProvider>
  );
}
