"use client";

import React, { useState, useEffect } from "react";
import DocumentExplorer from "./document-explorer";
import { DocumentsSidebar } from "./explorer/documents-sidebar";
import { DocumentViewType, NavigationLabel } from "../types/documents.enums";
import { DownloadQueueProvider } from "./download/download-queue-provider";
import { useSearchParams } from "next/navigation";
import { DOCUMENT_QUERY_PARAMS } from "../types/documents.constants";
import { documentsApi } from "../api/documents.api";

function DocumentsView() {
  const [activeView, setActiveView] = useState<DocumentViewType>(
    DocumentViewType.MY_FILES,
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: NavigationLabel.ROOT },
  ]);

  const searchParams = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams.get(DOCUMENT_QUERY_PARAMS.VIEW);
    const folderIdParam = searchParams.get(DOCUMENT_QUERY_PARAMS.FOLDER_ID);

    let activeV = DocumentViewType.MY_FILES;
    if (viewParam === DocumentViewType.SHARED) {
      activeV = DocumentViewType.SHARED;
    } else if (viewParam === DocumentViewType.STARRED) {
      activeV = DocumentViewType.STARRED;
    } else if (viewParam === DocumentViewType.TRASH) {
      activeV = DocumentViewType.TRASH;
    }

    if (viewParam) {
      setActiveView(activeV);
    }

    if (folderIdParam) {
      setCurrentFolderId(folderIdParam);
      const rootLabel =
        activeV === DocumentViewType.STARRED
          ? NavigationLabel.STARRED
          : activeV === DocumentViewType.SHARED
            ? NavigationLabel.SHARED
            : activeV === DocumentViewType.TRASH
              ? NavigationLabel.TRASH
              : NavigationLabel.ROOT;

      documentsApi
        .getBreadcrumbs(folderIdParam)
        .then((breadcrumbs) => {
          setPath([{ id: null, name: rootLabel }, ...breadcrumbs]);
        })
        .catch((err) => {
          console.error("Failed to load breadcrumbs", err);
          setPath([
            { id: null, name: rootLabel },
            { id: folderIdParam, name: "Folder" },
          ]);
        });
    }
  }, [searchParams]);

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
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f9fb] text-[#172B4D] xl:flex-row">
        {/* Navigation Sidebar */}
        <DocumentsSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        {/* Document Explorer Main Canvas */}
        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 rounded-lg border border-slate-100 bg-white p-6 shadow-xs min-h-0 overflow-hidden">
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
    </DownloadQueueProvider>
  );
}

export default React.memo(DocumentsView);
