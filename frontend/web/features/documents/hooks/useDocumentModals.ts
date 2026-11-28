"use client";

import { useState, useCallback } from "react";
import { DocumentItem } from "../types/documents.types";

export function useDocumentModals() {
  // Input Prompt Modals (Folder creation & Rename)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<DocumentItem | null>(null);

  // Feature Modals
  const [previewItem, setPreviewItem] = useState<DocumentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versioningItem, setVersioningItem] = useState<DocumentItem | null>(
    null,
  );
  const [previewVersionId, setPreviewVersionId] = useState<string>("");

  const [sharingItem, setSharingItem] = useState<DocumentItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [shareToChatItem, setShareToChatItem] = useState<DocumentItem | null>(
    null,
  );
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
