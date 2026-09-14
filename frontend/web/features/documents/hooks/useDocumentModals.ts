"use client";

import { useState, useCallback } from "react";
import { DocumentItem } from "../types/documents.types";

export function useDocumentModals() {
  // Input Prompt Modals (Folder creation & Rename)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<DocumentItem | null>(null);

  // Confirm Alert Dialogs (Move to Trash, Delete Permanently)
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false);
  const [trashingItem, setTrashingItem] = useState<DocumentItem | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<DocumentItem | null>(null);

  // Feature Modals
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<DocumentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versioningItem, setVersioningItem] = useState<DocumentItem | null>(null);
  const [previewVersionId, setPreviewVersionId] = useState<string>("");

  const [sharingItem, setSharingItem] = useState<DocumentItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [shareToChatItem, setShareToChatItem] = useState<DocumentItem | null>(null);
  const [isShareToChatOpen, setIsShareToChatOpen] = useState(false);

  // Open Handlers
  const openCreateFolder = useCallback(() => setIsCreateFolderOpen(true), []);
  const closeCreateFolder = useCallback(() => setIsCreateFolderOpen(false), []);

  const openRename = useCallback((item: DocumentItem) => {
    setRenamingItem(item);
    setIsRenameOpen(true);
  }, []);
  const closeRename = useCallback(() => {
    setRenamingItem(null);
    setIsRenameOpen(false);
  }, []);

  const openTrashConfirm = useCallback((item: DocumentItem) => {
    setTrashingItem(item);
    setIsTrashConfirmOpen(true);
  }, []);
  const closeTrashConfirm = useCallback(() => {
    setTrashingItem(null);
    setIsTrashConfirmOpen(false);
  }, []);

  const openDeleteConfirm = useCallback((item: DocumentItem) => {
    setDeletingItem(item);
    setIsDeleteConfirmOpen(true);
  }, []);
  const closeDeleteConfirm = useCallback(() => {
    setDeletingItem(null);
    setIsDeleteConfirmOpen(false);
  }, []);

  const openMoveModal = useCallback((itemId: string) => {
    setMovingItemId(itemId);
    setIsMoveModalOpen(true);
  }, []);
  const closeMoveModal = useCallback(() => {
    setMovingItemId(null);
    setIsMoveModalOpen(false);
  }, []);

  const openPreview = useCallback((item: DocumentItem, versionId?: string) => {
    setPreviewItem(item);
    setPreviewVersionId(versionId || "");
    setIsPreviewOpen(true);
  }, []);
  const closePreview = useCallback(() => {
    setPreviewItem(null);
    setPreviewVersionId("");
    setIsPreviewOpen(false);
  }, []);

  const openVersionModal = useCallback((item: DocumentItem) => {
    setVersioningItem(item);
    setIsVersionModalOpen(true);
  }, []);
  const closeVersionModal = useCallback(() => {
    setVersioningItem(null);
    setIsVersionModalOpen(false);
  }, []);

  const openShareModal = useCallback((item: DocumentItem) => {
    setSharingItem(item);
    setIsShareModalOpen(true);
  }, []);
  const closeShareModal = useCallback(() => {
    setSharingItem(null);
    setIsShareModalOpen(false);
  }, []);

  const openShareToChatModal = useCallback((item: DocumentItem) => {
    setShareToChatItem(item);
    setIsShareToChatOpen(true);
  }, []);
  const closeShareToChatModal = useCallback(() => {
    setShareToChatItem(null);
    setIsShareToChatOpen(false);
  }, []);

  return {
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
  };
}
