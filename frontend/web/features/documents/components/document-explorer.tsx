"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DndContext } from "@dnd-kit/core";
import { documentsApi } from "../api/documents.api";
import { DocumentItem } from "../types/documents.types";
import { DocumentViewType } from "../types/documents.enums";

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
import FolderPickerModal from "./common/folder-picker-modal";
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
import { ITEMS_PER_PAGE } from "../types/documents.constants";
import { UploadCloud, FolderPlus, Edit3 } from "lucide-react";

interface DocumentExplorerProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null, folderName?: string) => void;
  activeView: DocumentViewType;
  path: { id: string | null; name: string }[];
  setPath: React.Dispatch<
    React.SetStateAction<{ id: string | null; name: string }[]>
  >;
}

export function DocumentExplorer({
  currentFolderId,
  onNavigate,
  activeView,
  path,
  setPath,
}: DocumentExplorerProps) {
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
    isTrashConfirmOpen,
    trashingItem,
    openTrashConfirm,
    closeTrashConfirm,
    isDeleteConfirmOpen,
    deletingItem,
    openDeleteConfirm,
    closeDeleteConfirm,
    isMoveModalOpen,
    movingItemId,
    openMoveModal,
    closeMoveModal,
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
    moveResource,
    toggleStar,
    moveToTrash,
    isTrashing,
    restoreFromTrash,
    deletePermanently,
    isDeletingPermanently,
    downloadItem,
  } = useDocumentActions({ currentFolderId });

  // 4. File Upload Hook
  const {
    uploadState,
    uploadProgress,
    uploadingFileName,
    overwriteConflict,
    isDraggingOver,
    uploadFile,
    confirmOverwrite,
    cancelOverwrite,
  } = useDocumentUpload({ currentFolderId });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 5. Drag and Drop Hook
  const { sensors, handleDragEnd } = useDocumentDragAndDrop({
    onMoveItem: (itemId, targetFolderId) =>
      moveResource({ id: itemId, targetFolderId }),
  });

  // Query Main Document List
  const {
    data: documentResponse,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "documents",
      activeView,
      currentFolderId,
      sortBy,
      searchQuery,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      const page = Number(pageParam);
      if (currentFolderId) {
        return documentsApi.getDocuments({
          folderId: currentFolderId,
          sortBy,
          search: searchQuery || undefined,
          page,
          limit: ITEMS_PER_PAGE,
        });
      }

      if (activeView === DocumentViewType.SHARED) {
        return documentsApi.getSharedDocuments({
          page,
          limit: ITEMS_PER_PAGE,
          sortBy,
          search: searchQuery || undefined,
        });
      }
      return documentsApi.getDocuments({
        folderId: currentFolderId || undefined,
        starred: activeView === DocumentViewType.STARRED ? true : undefined,
        archived: activeView === DocumentViewType.TRASH ? true : undefined,
        sortBy,
        search: searchQuery || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
    },
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

  const activeDetailsItem = useMemo(
    () => items.find((i: DocumentItem) => i.id === activeDetailsItemId) || null,
    [items, activeDetailsItemId],
  );

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

  // Alert Dialog Confirmations
  const handleConfirmMoveToTrash = async () => {
    if (trashingItem) {
      await moveToTrash(trashingItem.id);
      closeTrashConfirm();
    }
  };

  const handleConfirmDeletePermanently = async () => {
    if (deletingItem) {
      await deletePermanently(deletingItem.id);
      closeDeleteConfirm();
    }
  };

  const loadMoreFooter =
    items.length > 0 ? (
      <div
        ref={loadMoreRef}
        className="flex min-h-8 items-center justify-center px-4 py-2 text-xs font-semibold text-slate-400"
      >
        {isFetchingNextPage ? "Loading more..." : null}
      </div>
    ) : null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative flex flex-1 flex-col min-h-0 h-full overflow-hidden bg-white text-slate-800">
        {/* Full Window Dropzone Overlay */}
        {isDraggingOver ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-500/10 backdrop-blur-xs border-2 border-dashed border-blue-400">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
              <UploadCloud className="h-8 w-8 animate-bounce" />
            </div>
            <p className="mt-4 text-base font-bold text-slate-800">
              Drop files here to upload
            </p>
          </div>
        ) : null}

        {/* Explorer Header Toolbar */}
        <div className="relative z-20 shrink-0 flex flex-col gap-3 bg-white/60 p-6 backdrop-blur-md">
          <ExplorerBreadcrumbs
            path={path}
            onBreadcrumbClick={handleBreadcrumbClick}
          />
          <ExplorerToolbar
            activeView={activeView}
            viewLayout={viewLayout}
            onViewLayoutChange={setViewLayout}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onCreateFolder={openCreateFolder}
            onUploadFile={uploadFile}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* Items View Area */}
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden px-6 mb-6">
              {isLoading ? (
                <DocumentsLoadingState
                  view={viewLayout === "GRID" ? "grid" : "list"}
                />
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
                    onMove={openMoveModal}
                    onToggleStar={(item) => toggleStar(item.id, item.isStarred)}
                    onMoveToTrash={openTrashConfirm}
                    onRestore={(item) => restoreFromTrash(item.id)}
                    onDeletePermanently={openDeleteConfirm}
                    onPreview={openPreview}
                    onDownload={downloadItem}
                    onDownloadFolder={downloadItem}
                    onManageVersions={openVersionModal}
                    onShare={openShareModal}
                    onShareToChat={openShareToChatModal}
                  />
                  {loadMoreFooter}
                </div>
              ) : (
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                  <ListView
                    scrollContainerRef={scrollContainerRef}
                    items={items}
                    footer={loadMoreFooter}
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
                    onMove={openMoveModal}
                    onToggleStar={(item) => toggleStar(item.id, item.isStarred)}
                    onMoveToTrash={openTrashConfirm}
                    onRestore={(item) => restoreFromTrash(item.id)}
                    onDeletePermanently={openDeleteConfirm}
                    onPreview={openPreview}
                    onDownload={downloadItem}
                    onDownloadFolder={downloadItem}
                    onManageVersions={openVersionModal}
                    onShare={openShareModal}
                    onShareToChat={openShareToChatModal}
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
              onRename={() => openRename(activeDetailsItem)}
              onShare={() => openShareModal(activeDetailsItem)}
              onDownload={() => downloadItem(activeDetailsItem)}
              onManageVersions={() => openVersionModal(activeDetailsItem)}
            />
          ) : null}
        </div>

        {/* Floating Upload Queue Widget */}
        <UploadProgress
          uploadState={uploadState}
          uploadProgress={uploadProgress}
          uploadingFileName={uploadingFileName}
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

        <DocumentsConfirmDialog
          open={isTrashConfirmOpen}
          title="Move to trash?"
          description="Are you sure you want to move this item to trash? You can restore it later."
          confirmLabel="Move to trash"
          cancelLabel="Cancel"
          variant="warning"
          isLoading={isTrashing}
          onConfirm={handleConfirmMoveToTrash}
          onCancel={closeTrashConfirm}
        />

        {/* Shadcn Alert Dialog: Delete Permanently */}
        <DocumentsConfirmDialog
          open={isDeleteConfirmOpen}
          title="Delete permanently?"
          description="This action cannot be undone. This item will be permanently deleted."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeletingPermanently}
          onConfirm={handleConfirmDeletePermanently}
          onCancel={closeDeleteConfirm}
        />

        {/* Folder Picker Move Modal */}
        {isMoveModalOpen && movingItemId ? (
          <FolderPickerModal
            open={isMoveModalOpen}
            movingItemId={movingItemId}
            onClose={closeMoveModal}
            onSelectFolder={(targetFolderId) =>
              moveResource({ id: movingItemId, targetFolderId })
            }
          />
        ) : null}

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
            open={isVersionModalOpen}
            item={versioningItem}
            onClose={closeVersionModal}
            onPreviewVersion={(item, versionId) => openPreview(item, versionId)}
          />
        ) : null}

        {/* Share Modal */}
        {isShareModalOpen && sharingItem ? (
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
            onClose={closeShareToChatModal}
          />
        ) : null}
      </div>
    </DndContext>
  );
}

export default DocumentExplorer;
