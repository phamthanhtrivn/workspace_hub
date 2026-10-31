"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import DocumentExplorer from "./document-explorer";
import { DocumentsSidebar } from "./explorer/documents-sidebar";
import { DocumentViewType, NavigationLabel } from "../types/documents.enums";
import { DownloadQueueProvider } from "./download/download-queue-provider";
import { useSearchParams } from "next/navigation";
import { DOCUMENT_QUERY_PARAMS } from "../types/documents.constants";
import { documentsApi } from "../api/documents.api";

type PathEntry = { id: string | null; name: string };

function DocumentsView() {
  const params = useSearchParams();
  const view = params.get(DOCUMENT_QUERY_PARAMS.VIEW);
  const initialView = [DocumentViewType.SHARED, DocumentViewType.STARRED, DocumentViewType.TRASH].find(candidate => candidate === view) ?? DocumentViewType.MY_FILES;
  return <DocumentsWorkspace key={params.toString()} initialView={initialView} initialFolderId={params.get(DOCUMENT_QUERY_PARAMS.FOLDER_ID)} />;
}

function DocumentsWorkspace({ initialView, initialFolderId }: { initialView: DocumentViewType; initialFolderId: string | null }) {
  const [activeView, setActiveView] = useState(initialView);
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const rootLabel = initialView === DocumentViewType.STARRED ? NavigationLabel.STARRED : initialView === DocumentViewType.SHARED ? NavigationLabel.SHARED : initialView === DocumentViewType.TRASH ? NavigationLabel.TRASH : NavigationLabel.ROOT;
  const [navigationPath, setNavigationPath] = useState<PathEntry[] | null>(null);
  const breadcrumbs = useQuery({
    queryKey: ["documents", "breadcrumbs", initialFolderId],
    queryFn: () => documentsApi.getBreadcrumbs(initialFolderId!),
    enabled: !!initialFolderId,
  });
  const initialPath: PathEntry[] = [
    { id: null, name: rootLabel },
    ...(initialFolderId ? breadcrumbs.data ?? [{ id: initialFolderId, name: "Folder" }] : []),
  ];
  const path = navigationPath ?? initialPath;
  const setPath: React.Dispatch<React.SetStateAction<PathEntry[]>> = update => {
    setNavigationPath(previous => typeof update === "function" ? update(previous ?? initialPath) : update);
  };

  const handleNavigate = (
    folderId: string | null,
    folderName?: string,
    viewContext?: DocumentViewType,
  ) => {
    setCurrentFolderId(folderId);
    const activeV = viewContext !== undefined ? viewContext : activeView;

    if (folderId === null) {
      const rootLabel =
        activeV === DocumentViewType.STARRED
          ? NavigationLabel.STARRED
          : activeV === DocumentViewType.SHARED
            ? NavigationLabel.SHARED
            : activeV === DocumentViewType.TRASH
              ? NavigationLabel.TRASH
              : NavigationLabel.ROOT;
      setPath([{ id: null, name: rootLabel }]);
    } else if (folderName) {
      const exists = path.some((p) => p.id === folderId);
      if (!exists) {
        setPath([...path, { id: folderId, name: folderName }]);
      }
    }
  };

  const handleViewChange = (view: DocumentViewType) => {
    setActiveView(view);
    handleNavigate(null, undefined, view);
  };

  return (
    <DownloadQueueProvider>
      <div className="@container/documents h-full min-h-0 min-w-0 w-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 min-w-0 flex-col @min-[960px]/documents:flex-row">
        {/* Navigation Sidebar */}
        <DocumentsSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        {/* Document Explorer Main Canvas */}
        <section className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 w-full flex-1 flex-col min-h-0 rounded-lg border border-border bg-card overflow-hidden">
            <DocumentExplorer
              currentFolderId={currentFolderId}
              onNavigate={handleNavigate}
              activeView={activeView}
              path={path}
              setPath={setPath}
            />
          </div>
        </section>
      </div>
      </div>
    </DownloadQueueProvider>
  );
}

export default React.memo(DocumentsView);
