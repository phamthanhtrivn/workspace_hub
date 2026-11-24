"use client";

import React, { useState, useEffect } from "react";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItem } from "@/features/documents/types/documents.types";
import {
  PreviewFileType,
  DocumentRole,
} from "@/features/documents/types/documents.enums";
import { getPreviewFileType } from "@/features/documents/utils/documents.utils";

import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { DocumentsInputModal } from "@/features/documents/components/ui/documents-input-modal";
import { QueryFeedback } from "@/components/common/query-feedback";
import VersionManagementModal from "@/features/documents/components/versions/version-management-modal";

import { SharedHeader } from "./shared-header";
import { SharedDenied } from "./shared-denied";
import { SharedDetails } from "./shared-details";
import { SharedPreview } from "./shared-preview";
import { SharedFolderBrowser } from "./shared-folder-browser";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { Spinner } from "@/components/ui/spinner";
import { logActionError } from "@/lib/permission-feedback";
import { getSharedDocumentAccessCode } from "@/features/documents/utils/shared-document-access";
import type { SharedDocumentAccessCode } from "@/features/documents/types/shared-document-access.constants";

export default function SharedDocumentView({ id }: { id: string }) {
  const isLoggedIn = useAppSelector((state) => !!state.auth.accessToken);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [accessCode, setAccessCode] = useState<SharedDocumentAccessCode | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [item, setItem] = useState<DocumentItem | null>(null);
  const [userRole, setUserRole] = useState<DocumentRole>(DocumentRole.NONE);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [textContent, setTextContent] = useState<string | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const previewRequest = React.useRef(0);

  const showAccessDenial = React.useCallback((failure: unknown) => {
    const reason = getSharedDocumentAccessCode(failure);
    if (!reason) return false;
    setAccessCode(reason);
    setItem(null);
    setUserRole(DocumentRole.NONE);
    setPreviewUrl(undefined);
    setTextContent(null);
    setPreviewError(null);
    setIsVersionModalOpen(false);
    setRenameOpen(false);

    return true;
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      setAccessCode(null);
      setPreviewError(null);
      setItem(null);
      setUserRole(DocumentRole.NONE);
      setPreviewUrl(undefined);
      setTextContent(null);
      let metadataAvailable = false;
      try {
        // 1. Fetch public metadata
        const data = await documentsApi.getPublicDocument(id);
        if (!active) return;

        metadataAvailable = true;
        setItem({ ...data.item, userRole: data.userRole as DocumentRole });
        setUserRole(data.userRole as DocumentRole);

        // Folders don't have preview/download URLs — skip steps 2 & 3
        if (data.item.type === DocumentItemType.FOLDER) {
          return;
        }

        // 2. Fetch public preview url
        setIsUrlLoading(true);
        const url = await documentsApi.getPublicPreviewUrl(id);
        if (!active) return;

        setPreviewUrl(url);
        setIsUrlLoading(false);

        // 3. Fetch text content if text file
        const type = getPreviewFileType(data.item.mimeType, data.item.name);
        if (type === PreviewFileType.TEXT && url) {
          setLoadingText(true);
          try {
            const text = await documentsApi.getTextPreview(url);
            if (!active) return;

            setTextContent(text);
          } catch (textErr) {
            if (active) {
              logActionError("Failed to load text preview", textErr);
              setPreviewError("Could not load the text preview.");
            }
          } finally {
            if (active) setLoadingText(false);
          }
        }
      } catch (err: unknown) {
        if (!active || showAccessDenial(err)) return;
        logActionError("Failed to load shared document", err);
        if (metadataAvailable) {
          setPreviewError("Could not load the document preview.");

          return;
        }
        setError("Could not load shared document details");
      } finally {
        if (active) {
          setIsLoading(false);
          setIsUrlLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
      previewRequest.current += 1;
    };
  }, [id, isLoggedIn, retryKey, showAccessDenial]);

  const handleDownload = async () => {
    if (!item) return;
    try {
      const downloadUrl = await documentsApi.getPublicDownloadUrl(item.id);
      const link = document.createElement("a");
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      if (showAccessDenial(err)) return;
      logActionError("Failed to download file", err);
      toast.error("Could not create a download link");
    }
  };

  const saveRename = async (name: string) => {
    if (!item || renaming) return;
    setRenaming(true);
    try {
      const updated = await documentsApi.renamePublicItem(item.id, name);
      setItem(updated);
      setRenameOpen(false);
      toast.success("Document renamed");
    } catch {
      toast.error("Could not rename this document. Please try again.");
    } finally {
      setRenaming(false);
    }
  };

  const refreshVersionPreview = async (
    document: DocumentItem,
    versionId?: string,
  ) => {
    const request = ++previewRequest.current;
    setIsUrlLoading(true);
    setPreviewError(null);
    setTextContent(null);
    try {
      const url = await documentsApi.getPublicPreviewUrl(
        document.id,
        versionId,
      );
      const text =
        getPreviewFileType(document.mimeType, document.name) ===
        PreviewFileType.TEXT
          ? await documentsApi.getTextPreview(url)
          : null;
      if (request !== previewRequest.current) return;
      setPreviewUrl(url);
      setTextContent(text);
    } catch (error) {
      if (request !== previewRequest.current || showAccessDenial(error)) return;
      setPreviewError("Could not load the document preview.");
      logActionError("Failed to refresh document preview", error);
    } finally {
      if (request === previewRequest.current) setIsUrlLoading(false);
    }
  };

  const handleVersionUploaded = async () => {
    if (!item) return;
    try {
      // Refresh public metadata
      const data = await documentsApi.getPublicDocument(id);
      setItem({ ...data.item, userRole: data.userRole as DocumentRole });

      await refreshVersionPreview(data.item);
    } catch (err) {
      if (showAccessDenial(err)) return;
      logActionError("Failed to refresh document after upload", err);
      toast.error(
        "The version changed, but document details could not refresh. Try again.",
      );
    }
  };

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 text-muted-foreground"
      >
        <Spinner size={32} />
        <span className="text-sm font-semibold">
          Loading document details...
        </span>
      </div>
    );
  }

  if (accessCode)
    return <SharedDenied reason={accessCode} isLoggedIn={isLoggedIn} />;

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background p-6">
        <SharedHeader isLoggedIn={isLoggedIn} />
        <QueryFeedback
          label="shared document"
          error
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      </div>
    );
  }

  // ── Folder: render folder browser ─────────────────────────────────────────
  if (item.type === DocumentItemType.FOLDER) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SharedHeader isLoggedIn={isLoggedIn} />
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
          <SharedDetails
            item={item}
            userRole={userRole}
            onDownload={undefined}
            onViewVersions={undefined}
            onRename={undefined}
          />
          <SharedFolderBrowser
            rootItem={item}
            rootId={id}
            userRole={userRole}
          />
        </main>
      </div>
    );
  }

  // ── File: existing behavior ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <SharedHeader isLoggedIn={isLoggedIn} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Document Details Card */}
        <SharedDetails
          item={item}
          userRole={userRole}
          onDownload={handleDownload}
          onViewVersions={
            userRole === DocumentRole.OWNER || userRole === DocumentRole.EDITOR
              ? () => setIsVersionModalOpen(true)
              : undefined
          }
          onRename={
            userRole === DocumentRole.OWNER || userRole === DocumentRole.EDITOR
              ? () => setRenameOpen(true)
              : undefined
          }
        />

        {/* Preview Panel */}
        <SharedPreview
          item={item}
          previewUrl={previewUrl}
          textContent={textContent}
          isUrlLoading={isUrlLoading}
          loadingText={loadingText}
          error={previewError}
          onDownload={handleDownload}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      </main>

      <DocumentsInputModal
        open={renameOpen}
        title="Rename shared document"
        defaultValue={item.name}
        confirmLabel="Save"
        cancelLabel="Cancel"
        isLoading={renaming}
        onCancel={() => setRenameOpen(false)}
        onConfirm={(name) => void saveRename(name)}
      />
      <VersionManagementModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        item={item}
        onPreviewVersion={(document, versionId) =>
          void refreshVersionPreview(document, versionId)
        }
        isPublic={true}
        onVersionUploaded={handleVersionUploaded}
      />
    </div>
  );
}
