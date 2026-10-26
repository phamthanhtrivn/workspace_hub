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
import { MAX_TEXT_PREVIEW_SIZE } from "@/features/documents/types/documents.constants";
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

export default function SharedDocumentView({ id }: { id: string }) {
  const isLoggedIn = useAppSelector((state) => !!state.auth.accessToken);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [accessDenied, setAccessDenied] = useState(false);
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

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null); setAccessDenied(false); setPreviewError(null);
      let metadataAvailable = false;
      try {
        // 1. Fetch public metadata
        const data = await documentsApi.getPublicDocument(id);
        if (!active) return;

        metadataAvailable = true;
        setItem(data.item);
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
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load text content");
            const text = await res.text();
            if (!active) return;

            if (text.length > MAX_TEXT_PREVIEW_SIZE) {
              setTextContent(
                text.slice(0, MAX_TEXT_PREVIEW_SIZE) +
                  "\n\n... [Preview truncated. Download to read the full document] ...",
              );
            } else {
              setTextContent(text);
            }
          } catch (textErr) {
            console.error(textErr);
            if (active) {
              setPreviewError("Could not load the text preview.");
            }
          } finally {
            if (active) setLoadingText(false);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load shared document", err);
        if (active) {
          const axiosError = err as {
            response?: { status?: number; data?: { message?: string } };
            message?: string;
          };
          if (metadataAvailable) { setPreviewError("Could not load the document preview."); return; }
          setAccessDenied([401, 403, 404, 410].includes(axiosError.response?.status ?? 0));
          setError(
            axiosError.response?.data?.message ||
              axiosError.message ||
              "Could not load shared document details",
          );
        }
      } finally {
        if (active) { setIsLoading(false); setIsUrlLoading(false); }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [id, retryKey]);

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
      console.error("Failed to download file", err);
      toast.error("Could not create a download link");
    }
  };

  const saveRename = async (name: string) => {
    if (!item || renaming) return;
    setRenaming(true);
    try { const updated = await documentsApi.renamePublicItem(item.id, name); setItem(updated); setRenameOpen(false); toast.success("Document renamed"); }
    catch { toast.error("Could not rename this document. Please try again."); }
    finally { setRenaming(false); }
  };

  const handleVersionUploaded = async () => {
    if (!item) return;
    try {
      // Refresh public metadata
      const data = await documentsApi.getPublicDocument(id);
      setItem(data.item);

      // Refresh preview url
      const url = await documentsApi.getPublicPreviewUrl(id);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Failed to refresh document after upload", err);
      toast.error("The version was uploaded, but the preview could not refresh. Try again.");
    }
  };

  if (isLoading) {
    return (
      <div role="status" className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 text-muted-foreground">
        <Spinner size={32} />
        <span className="text-sm font-semibold">
          Loading document details...
        </span>
      </div>
    );
  }

  if (error || !item) {
    if (accessDenied) return <SharedDenied />;
    return <div className="min-h-screen bg-background p-6"><SharedHeader isLoggedIn={isLoggedIn} /><QueryFeedback label="shared document" error onRetry={() => setRetryKey(value => value + 1)} /></div>;
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
          onViewVersions={() => setIsVersionModalOpen(true)}
          onRename={userRole === DocumentRole.EDITOR ? () => setRenameOpen(true) : undefined}
        />

        {previewError && <QueryFeedback label="document preview" error onRetry={() => setRetryKey(value => value + 1)} />}
        {/* Preview Panel */}
        <SharedPreview
          item={item}
          previewUrl={previewUrl}
          textContent={textContent}
          isUrlLoading={isUrlLoading}
          loadingText={loadingText}
          error={previewError}
          onDownload={handleDownload}
        />
      </main>

      <DocumentsInputModal open={renameOpen} title="Rename shared document" defaultValue={item.name} confirmLabel="Save" cancelLabel="Cancel" isLoading={renaming} onCancel={() => setRenameOpen(false)} onConfirm={name => void saveRename(name)} />
      <VersionManagementModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        item={item}
        onPreviewVersion={async (itm, versionId) => {
          try {
            setIsUrlLoading(true);
            const url = await documentsApi.getPublicPreviewUrl(
              itm.id,
              versionId,
            );
            setPreviewUrl(url);
            setIsUrlLoading(false);
          } catch (err) {
            console.error("Failed to preview version", err);
            toast.error("Could not preview this version");
            setIsUrlLoading(false);
          }
        }}
        isPublic={true}
        onVersionUploaded={handleVersionUploaded}
      />
    </div>
  );
}
