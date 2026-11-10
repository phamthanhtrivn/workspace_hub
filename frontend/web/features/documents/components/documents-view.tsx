"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import DocumentExplorer from "./document-explorer";
import { DocumentNotificationTarget } from './document-notification-target';
import { DocumentsSidebar } from "./explorer/documents-sidebar";
import { DocumentViewType, NavigationLabel } from "../types/documents.enums";
import { DownloadQueueProvider } from "./download/download-queue-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { DOCUMENT_QUERY_PARAMS } from "../types/documents.constants";
import { documentsApi } from "../api/documents.api";
import { useAppSelector } from "@/store/store";
import { QueryFeedback } from "@/components/common/query-feedback";
import {
  canonicalizeDocumentFolderQuery,
  DOCUMENTS_PATH,
  documentFolderAccessKey,
  getDocumentView,
  getDocumentViewUrl,
  parseDocumentView,
} from "../utils/document-navigation";

type PathEntry = { id: string | null; name: string };

function DocumentsView() {
  return <DownloadQueueProvider><DocumentsLocation /></DownloadQueueProvider>;
}

function DocumentsLocation() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = useAppSelector((state) => state.auth.userId);
  const view = params.get(DOCUMENT_QUERY_PARAMS.VIEW);
  const initialView = parseDocumentView(view);
  const folderId = params.get(DOCUMENT_QUERY_PARAMS.FOLDER_ID);
  const resolveView =
    !!folderId &&
    (initialView === DocumentViewType.MY_FILES ||
      initialView === DocumentViewType.SHARED);
  const access = useQuery({
    queryKey: documentFolderAccessKey(userId, folderId),
    queryFn: () => documentsApi.getAccessibleItem(folderId!),
    enabled: !!userId && resolveView,
    staleTime: 0,
    retry: false,
  });
  const query = params.toString();
  const canonicalQuery = canonicalizeDocumentFolderQuery(
    query, resolveView ? access.data?.userRole : undefined,
  );
  useEffect(() => {
    if (canonicalQuery !== query)
      router.replace(
        `${DOCUMENTS_PATH}${canonicalQuery ? `?${canonicalQuery}` : ""}${window.location.hash}`,
        { scroll: false },
      );
  }, [canonicalQuery, query, router]);
  if (resolveView && (access.isPending || access.error)) {
    return (
      <QueryFeedback
        label="folder access"
        pending={access.isPending && !access.error}
        error={!!access.error}
        retrying={access.isFetching}
        onRetry={() => access.refetch()}
      />
    );
  }
  const resolvedView =
    resolveView && access.data
      ? getDocumentView(access.data.userRole)
      : initialView;

  return (
    <DocumentsWorkspace
      key={`${canonicalQuery}:${resolvedView}`}
      initialView={resolvedView}
      initialFolderId={folderId}
    />
  );
}

function DocumentsWorkspace({
  initialView,
  initialFolderId,
}: {
  initialView: DocumentViewType;
  initialFolderId: string | null;
}) {
  const router = useRouter();
  const activeView = initialView;
  const currentFolderId = initialFolderId;
  const rootLabel =
    activeView === DocumentViewType.STARRED
      ? NavigationLabel.STARRED
      : activeView === DocumentViewType.SHARED
        ? NavigationLabel.SHARED
        : activeView === DocumentViewType.TRASH
          ? NavigationLabel.TRASH
          : NavigationLabel.ROOT;
  const [navigationPath, setNavigationPath] = useState<PathEntry[] | null>(
    null,
  );
  const breadcrumbs = useQuery({
    queryKey: ["documents", "breadcrumbs", initialFolderId],
    queryFn: () => documentsApi.getBreadcrumbs(initialFolderId!),
    enabled: !!initialFolderId,
  });
  const initialPath: PathEntry[] = [
    { id: null, name: rootLabel },
    ...(initialFolderId
      ? (breadcrumbs.data ?? [{ id: initialFolderId, name: "Folder" }])
      : []),
  ];
  const path = navigationPath ?? initialPath;
  const setPath: React.Dispatch<React.SetStateAction<PathEntry[]>> = (
    update,
  ) => {
    setNavigationPath((previous) =>
      typeof update === "function" ? update(previous ?? initialPath) : update,
    );
  };

  const handleNavigate = (folderId: string | null) => {
    router.push(getDocumentViewUrl(activeView, folderId), { scroll: false });
  };

  const handleViewChange = (view: DocumentViewType) => {
    router.push(getDocumentViewUrl(view), { scroll: false });
  };

  return (
      <div className="@container/documents h-full min-h-0 min-w-0 w-full overflow-hidden bg-background text-foreground">
        <div className="flex h-full min-h-0 min-w-0 flex-col @min-[960px]/documents:flex-row">
          {/* Navigation Sidebar */}
          <DocumentsSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
          />

          {/* Document Explorer Main Canvas */}
          <section className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
            <DocumentNotificationTarget />
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
  );
}

export default React.memo(DocumentsView);
