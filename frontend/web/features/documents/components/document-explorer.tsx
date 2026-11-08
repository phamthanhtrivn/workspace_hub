"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { QueryFeedback } from "@/components/common/query-feedback";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { PERMISSION_REASON } from "@/lib/permission-feedback";
import { DndContext } from "@dnd-kit/core";
import { documentsApi } from "../api/documents.api";
import { DocumentItem } from "../types/documents.types";
import { DocumentRole, DocumentViewType } from "../types/documents.enums";

// UI Building Blocks
import { DocumentsConfirmDialog } from "./ui/documents-confirm-dialog";
import { DocumentsInputModal } from "./ui/documents-input-modal";
import { DocumentsEmptyState } from "./ui/documents-empty-state";
import { DocumentsLoadingState } from "./ui/documents-loading-state";

// Explorer & Modal Sub-components
import DetailsPanel from "./explorer/details-panel";
import ExplorerToolbar from "./explorer/explorer-toolbar";
import ExplorerBreadcrumbs from "./explorer/explorer-breadcrumbs";
import UploadProgress from "./common/upload-progress";
import GridView from "./views/grid-view";
import ListView from "./views/list-view";
import FilePreviewModal from "./preview/file-preview-modal";
import VersionManagementModal from "./versions/version-management-modal";
import ShareModal from "./sharing/share-modal";
import ShareToChatModal from "./sharing/share-to-chat-modal";

// Custom Hooks & Utils
import { useDocumentExplorerState } from "../hooks/useDocumentExplorerState";
import { useDocumentActions } from "../hooks/useDocumentActions";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { useDocumentDragAndDrop } from "../hooks/useDocumentDragAndDrop";
import { useDocumentModals } from "../hooks/useDocumentModals";
import { getDocumentListPage } from "../api/document-list.api";
import { useDocumentBulkSelection } from "../hooks/useDocumentBulkSelection";
import { DocumentBulkControls } from "./explorer/document-bulk-controls";
import { DocumentActionsMenu } from "./explorer/document-actions-menu";
import { DocumentBulkAction } from "../types/document-bulk.types";
import { Info, UploadCloud, FolderPlus, Edit3 } from "lucide-react";
import { resolveDocumentProjectContext } from "../utils/project-documents";
import { documentFolderAccessKey } from "../utils/document-navigation";

interface DocumentExplorerProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null, folderName?: string) => void;
  activeView: DocumentViewType;
  path: { id: string | null; name: string }[];
  setPath: React.Dispatch<
    React.SetStateAction<{ id: string | null; name: string }[]>
  >;
  projectId?: string;
  canEditDocuments?: boolean;
  accessErrorTitle?: string;
  accessErrorDescription?: string;
}

export function DocumentExplorer({
  currentFolderId,
  onNavigate,
  activeView,
  path,
  setPath,
  projectId: projectContextId,
  canEditDocuments = true,
  accessErrorTitle = "Unable to load documents",
  accessErrorDescription = "You do not have access to these documents yet",
}: DocumentExplorerProps) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const folderAccess = useQuery({
    queryKey: documentFolderAccessKey(currentUserId, currentFolderId),
    queryFn: () => documentsApi.getAccessibleItem(currentFolderId!),
    enabled: Boolean(currentUserId && currentFolderId && canEditDocuments),
    retry: false,
    staleTime: 60_000,
  });
  const projectContext = resolveDocumentProjectContext({
    projectId: projectContextId,
    folderProjectId: folderAccess.data?.projectId,
    path,
  });
  const projectId = projectContext.projectId;
  const isProjectDocuments = Boolean(projectId);
  const canWriteCurrentFolder =
    canEditDocuments &&
    (!currentFolderId ||
      folderAccess.data?.userRole === DocumentRole.OWNER ||
      folderAccess.data?.userRole === DocumentRole.EDITOR);
  const projectRootFolderId = projectContext.rootFolderId;
  const projectRootLabel = projectContext.rootLabel;
  // 1. Explorer State Hook
  const {
    activeMenuId,
    setActiveMenuId,
    viewLayout,
    setViewLayout,
    selectedItemId,
    setSelectedItemId,
    activeDetailsItemId,
    setActiveDetailsItemId,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    handleNavigate,
  } = useDocumentExplorerState({
    initialFolderId: currentFolderId,
    activeView,
    onNavigate,
  });

  // 2. Modals Hook
  const {
    isCreateFolderOpen,
    openCreateFolder,
    closeCreateFolder,
    isRenameOpen,
    renamingItem,
    openRename,
    closeRename,
    previewItem,
    previewVersionId,
    isPreviewOpen,
    openPreview,
    closePreview,
    isVersionModalOpen,
    versioningItem,
    openVersionModal,
    closeVersionModal,
    sharingItem,
    isShareModalOpen,
    openShareModal,
    closeShareModal,
    shareToChatItem,
    isShareToChatOpen,
    openShareToChatModal,
    closeShareToChatModal,
  } = useDocumentModals();

  // 3. Document Actions Hook
  const {
    createFolder,
    isCreatingFolder,
    renameResource,
    isRenaming,
    downloadItem,
  } = useDocumentActions({ currentFolderId, projectId });

  // 4. File Upload Hook
  const {
    uploads,
    retryFailed,
    dismissUploads,
    overwriteConflict,
    isDraggingOver,
    uploadFile,
    confirmOverwrite,
    cancelOverwrite,
  } = useDocumentUpload({
    currentFolderId,
    projectId,
    enabled: canWriteCurrentFolder,
  });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const bulkSelection = useDocumentBulkSelection({
    activeView,
    projectId,
    currentFolderId,
    sortBy,
    searchQuery,
  });
  const multiSelection = bulkSelection.active
    ? {
        action: bulkSelection.action,
        items: bulkSelection.items,
        selectedIds: bulkSelection.selectedIds,
        onToggle: bulkSelection.toggle,
        disabled: bulkSelection.busy,
        getDisabledReason: bulkSelection.getDisabledReason,
      }
    : undefined;

  const { sensors, handleDragEnd } = useDocumentDragAndDrop({
    onDropItems: bulkSelection.requestDrop,
  });

  // Query Main Document List
  const {
    data: documentResponse,
    isLoading,
    isError,
    error: documentError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isFetching,
  } = useInfiniteQuery({
    queryKey: [
      "documents",
      activeView,
      projectId,
      currentFolderId,
      sortBy,
      searchQuery,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1, signal }) =>
      getDocumentListPage(
        { activeView, projectId, currentFolderId, sortBy, searchQuery },
        Number(pageParam),
        signal,
      ),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;

      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });

  const items = useMemo(
    () => documentResponse?.pages.flatMap((page) => page.data) || [],
    [documentResponse],
  );

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "160px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    items.length,
    viewLayout,
  ]);

  const startBulkAction = (
    action: DocumentBulkAction,
    initialItem?: DocumentItem,
  ) => {
    setActiveMenuId(null);
    setSelectedItemId(null);
    setActiveDetailsItemId(null);
    bulkSelection.start(action, initialItem);
  };

  const activeDetailsItem = useMemo(
    () => items.find((i: DocumentItem) => i.id === activeDetailsItemId) || null,
    [items, activeDetailsItemId],
  );
  const canEditActiveDetailsItem =
    activeDetailsItem?.userRole === DocumentRole.OWNER ||
    activeDetailsItem?.userRole === DocumentRole.EDITOR;

  // Folder click navigation
  const handleFolderClick = useCallback(
    (folder: DocumentItem) => {
      handleNavigate(folder.id, folder.name);
    },
    [handleNavigate],
  );

  // Breadcrumb navigation click
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const target = path[index];
      setPath(path.slice(0, index + 1));
      handleNavigate(target.id, target.name);
    },
    [path, setPath, handleNavigate],
  );

  // Input Modal Confirmations
  const handleConfirmCreateFolder = async (name: string) => {
    await createFolder(name);
    closeCreateFolder();
  };

  const handleConfirmRename = async (newName: string) => {
    if (renamingItem) {
      await renameResource({ id: renamingItem.id, name: newName });
      closeRename();
    }
  };

  const loadMoreFooter =
    items.length > 0 ? (
      <div
        ref={loadMoreRef}
        className="flex min-h-8 items-center justify-center px-4 py-2 text-xs font-semibold text-muted-foreground"
      >
        {isFetchingNextPage ? (
          <LoadingState label="Loading more..." size={14} className="text-xs" />
        ) : null}
      </div>
    ) : null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="@container/explorer relative flex flex-1 flex-col min-h-0 min-w-0 h-full overflow-y-auto bg-card text-foreground">
        {/* Full Window Dropzone Overlay */}
        {isDraggingOver ? (
          <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/10 border-2 border-dashed border-info-outline">
            <div className="grid h-16 w-16 place-items-center rounded-panel bg-info-soft text-info-content ring-1 ring-ring">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">
              Drop files here to upload
            </p>
          </div>
        ) : null}

        {/* Explorer Header Toolbar */}
        <div
          className={`relative z-20 shrink-0 flex flex-col gap-3 bg-card min-w-0 p-3 @min-[640px]/explorer:p-4`}
        >
          <ExplorerBreadcrumbs
            allowRootDrop={activeView === DocumentViewType.MY_FILES}
            path={path}
            onBreadcrumbClick={handleBreadcrumbClick}
          />
          {bulkSelection.active ? (
            <DocumentBulkControls
              selection={bulkSelection}
              currentFolderId={currentFolderId}
              projectRootFolderId={projectRootFolderId}
              projectRootLabel={projectRootLabel}
            />
          ) : (
            <ExplorerToolbar
              actions={
                <DocumentActionsMenu
                  items={items}
                  activeView={activeView}
                  projectId={projectId}
                  hasMore={!!hasNextPage}
                  disabled={isLoading || bulkSelection.busy}
                  onChoose={startBulkAction}
                />
              }
              activeView={activeView}
              viewLayout={viewLayout}
              onViewLayoutChange={setViewLayout}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onCreateFolder={openCreateFolder}
              onUploadFile={uploadFile}
              canEditDocuments={canWriteCurrentFolder}
              editDisabledReason={
                folderAccess.isFetching && !folderAccess.data
                  ? "Checking folder permissions..."
                  : isProjectDocuments
                    ? PERMISSION_REASON.projectDocuments
                    : PERMISSION_REASON.documentEdit
              }
            />
          )}
          {activeView === DocumentViewType.TRASH && !bulkSelection.active ? (
            <div className="flex items-start gap-2 rounded-panel border border-border bg-warning-soft px-3.5 py-3 text-xs font-semibold text-warning-content">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning-content" />
              <p>
                Items in Trash are automatically deleted after 30 days. You can
                permanently delete them now.
              </p>
            </div>
          ) : null}
        </div>

        {/* Main Content Area */}
        <div
          data-document-canvas
          className={`flex flex-1 overflow-hidden @container/document-canvas relative min-h-40 min-w-0 shrink-0`}
        >
          <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
            {isError && items.length > 0 && (
              <QueryFeedback
                label="documents"
                error
                retrying={isFetching}
                onRetry={() => refetch()}
              />
            )}
            {/* Items View Area */}
            <div
              className={`flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden @container/document-items min-w-0 px-3 mb-3 @min-[640px]/explorer:px-4 @min-[640px]/explorer:mb-4`}
            >
              {isLoading ? (
                <DocumentsLoadingState
                  view={viewLayout === "GRID" ? "grid" : "list"}
                />
              ) : isError && items.length === 0 ? (
                <div className="space-y-3">
                  <QueryFeedback
                    label="documents"
                    error
                    retrying={isFetching}
                    onRetry={() => refetch()}
                  />
                  <DocumentsEmptyState
                    title={accessErrorTitle}
                    description={
                      (
                        documentError as {
                          response?: { data?: { message?: string } };
                        }
                      )?.response?.data?.message ||
                      ((documentError as { response?: { status?: number } })
                        ?.response?.status === 403
                        ? accessErrorDescription
                        : "The document service is unavailable. Your files have not been removed.")
                    }
                  />
                </div>
              ) : items.length === 0 ? (
                <DocumentsEmptyState
                  title={
                    searchQuery
                      ? "No items found"
                      : activeView === DocumentViewType.TRASH
                        ? "Trash is empty"
                        : activeView === DocumentViewType.STARRED
                          ? "No starred items"
                          : "This folder is empty"
                  }
                  description={
                    searchQuery
                      ? `No matching resources found for "${searchQuery}"`
                      : activeView === DocumentViewType.TRASH
                        ? "Deleted items will appear here before permanent removal"
                        : "Upload files or create new folders to get started"
                  }
                />
              ) : viewLayout === "GRID" ? (
                <div
                  ref={scrollContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto"
                >
                  <GridView
                    items={items}
                    activeView={activeView}
                    selection={multiSelection}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    onOpenItem={(item) =>
                      item.type === "FOLDER"
                        ? handleFolderClick(item)
                        : openPreview(item)
                    }
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    onOpenDetails={(item) => setActiveDetailsItemId(item.id)}
                    onRename={openRename}
                    onMove={(id) =>
                      startBulkAction(
                        DocumentBulkAction.MOVE,
                        items.find((item) => item.id === id),
                      )
                    }
                    onToggleStar={
                      isProjectDocuments
                        ? undefined
                        : (item) =>
                            startBulkAction(
                              item.isStarred
                                ? DocumentBulkAction.UNSTAR
                                : DocumentBulkAction.STAR,
                              item,
                            )
                    }
                    onMoveToTrash={(item) =>
                      startBulkAction(DocumentBulkAction.TRASH, item)
                    }
                    onRestore={(item) =>
                      startBulkAction(DocumentBulkAction.RESTORE, item)
                    }
                    onDeletePermanently={(item) =>
                      startBulkAction(DocumentBulkAction.DELETE, item)
                    }
                    onPreview={openPreview}
                    onDownload={downloadItem}
                    onDownloadFolder={downloadItem}
                    onManageVersions={openVersionModal}
                    onShare={isProjectDocuments ? undefined : openShareModal}
                    onShareToChat={openShareToChatModal}
                    isProjectDocuments={isProjectDocuments}
                  />
                  {loadMoreFooter}
                </div>
              ) : (
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                  <ListView
                    scrollContainerRef={scrollContainerRef}
                    items={items}
                    activeView={activeView}
                    footer={loadMoreFooter}
                    selection={multiSelection}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    onOpenItem={(item) =>
                      item.type === "FOLDER"
                        ? handleFolderClick(item)
                        : openPreview(item)
                    }
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    onOpenDetails={(item) => setActiveDetailsItemId(item.id)}
                    onRename={openRename}
                    onMove={(id) =>
                      startBulkAction(
                        DocumentBulkAction.MOVE,
                        items.find((item) => item.id === id),
                      )
                    }
                    onToggleStar={
                      isProjectDocuments
                        ? undefined
                        : (item) =>
                            startBulkAction(
                              item.isStarred
                                ? DocumentBulkAction.UNSTAR
                                : DocumentBulkAction.STAR,
                              item,
                            )
                    }
                    onMoveToTrash={(item) =>
                      startBulkAction(DocumentBulkAction.TRASH, item)
                    }
                    onRestore={(item) =>
                      startBulkAction(DocumentBulkAction.RESTORE, item)
                    }
                    onDeletePermanently={(item) =>
                      startBulkAction(DocumentBulkAction.DELETE, item)
                    }
                    onPreview={openPreview}
                    onDownload={downloadItem}
                    onDownloadFolder={downloadItem}
                    onManageVersions={openVersionModal}
                    onShare={isProjectDocuments ? undefined : openShareModal}
                    onShareToChat={openShareToChatModal}
                    isProjectDocuments={isProjectDocuments}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Details Side Panel */}
          {activeDetailsItem ? (
            <DetailsPanel
              item={activeDetailsItem}
              onClose={() => setActiveDetailsItemId(null)}
              onRename={
                canEditActiveDetailsItem
                  ? () => openRename(activeDetailsItem)
                  : undefined
              }
              onShare={
                canEditActiveDetailsItem && !isProjectDocuments
                  ? () => openShareModal(activeDetailsItem)
                  : undefined
              }
              onDownload={() => downloadItem(activeDetailsItem)}
              onManageVersions={
                canEditActiveDetailsItem
                  ? () => openVersionModal(activeDetailsItem)
                  : undefined
              }
            />
          ) : null}
        </div>

        {/* Floating Upload Queue Widget */}
        <UploadProgress
          uploads={uploads}
          onRetry={(id) => void retryFailed(id)}
          onDismiss={dismissUploads}
        />

        {/* Shadcn Input Modal: Create Folder */}
        <DocumentsInputModal
          open={isCreateFolderOpen}
          title="New folder"
          placeholder="Enter folder name..."
          confirmLabel="Create"
          cancelLabel="Cancel"
          icon={FolderPlus}
          isLoading={isCreatingFolder}
          errorMessage="Folder name is required"
          onConfirm={handleConfirmCreateFolder}
          onCancel={closeCreateFolder}
        />

        {/* Shadcn Input Modal: Rename Resource */}
        <DocumentsInputModal
          open={isRenameOpen}
          title="Rename item"
          defaultValue={renamingItem?.name || ""}
          confirmLabel="Save"
          cancelLabel="Cancel"
          icon={Edit3}
          isLoading={isRenaming}
          errorMessage="Name is required"
          onConfirm={handleConfirmRename}
          onCancel={closeRename}
        />

        {/* Shadcn Alert Dialog: Overwrite File */}
        <DocumentsConfirmDialog
          open={Boolean(overwriteConflict)}
          title="Overwrite existing file?"
          description={
            overwriteConflict
              ? `"${overwriteConflict.item.name}" already exists in this folder. Overwriting will upload this file as a new version.`
              : undefined
          }
          confirmLabel="Overwrite"
          cancelLabel="Cancel"
          variant="warning"
          isLoading={false}
          onConfirm={confirmOverwrite}
          onCancel={cancelOverwrite}
        />

        {/* File Preview Modal */}
        {isPreviewOpen && previewItem ? (
          <FilePreviewModal
            open={isPreviewOpen}
            item={previewItem}
            versionId={previewVersionId}
            onClose={closePreview}
            onDownload={downloadItem}
            onOpenDetails={(item) => setActiveDetailsItemId(item.id)}
          />
        ) : null}

        {/* Version Management Modal */}
        {isVersionModalOpen && versioningItem ? (
          <VersionManagementModal
            key={versioningItem.id}
            open={isVersionModalOpen}
            item={versioningItem}
            onClose={closeVersionModal}
            onPreviewVersion={(item, versionId) => openPreview(item, versionId)}
          />
        ) : null}

        {/* Share Modal */}
        {!isProjectDocuments && isShareModalOpen && sharingItem ? (
          <ShareModal
            open={isShareModalOpen}
            item={sharingItem}
            onClose={closeShareModal}
          />
        ) : null}

        {/* Share to Chat Modal */}
        {isShareToChatOpen && shareToChatItem ? (
          <ShareToChatModal
            open={isShareToChatOpen}
            item={shareToChatItem}
            projectId={projectId}
            onClose={closeShareToChatModal}
          />
        ) : null}
      </div>
    </DndContext>
  );
}

export default DocumentExplorer;
