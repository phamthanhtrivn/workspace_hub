"use client";

import React, { useState, useEffect, use } from "react";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItem } from "@/features/documents/types/documents.types";
import {
  PreviewFileType,
  DocumentRole,
} from "@/features/documents/types/documents.enums";
import { getPreviewFileType } from "@/features/documents/utils/documents.utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_TEXT_PREVIEW_SIZE } from "@/features/documents/types/documents.constants";
import { useAppSelector } from "@/store/store";
import Swal from "sweetalert2";
import VersionManagementModal from "@/features/documents/components/versions/version-management-modal";

import { SharedHeader } from "./components/shared-header";
import { SharedDenied } from "./components/shared-denied";
import { SharedDetails } from "./components/shared-details";
import { SharedPreview } from "./components/shared-preview";
import { SharedFolderBrowser } from "./components/shared-folder-browser";
import { DocumentItemType } from "@/features/documents/types/documents.enums";

type Params = Promise<{ id: string }>;

export default function SharedDocumentPage({ params }: { params: Params }) {
  const { id } = use(params);
  const isLoggedIn = useAppSelector((state) => !!state.auth.accessToken);

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
      setError(null);
      try {
        // 1. Fetch public metadata
        const data = await documentsApi.getPublicDocument(id);
        if (!active) return;

        setItem(data.item);
        setUserRole(data.userRole as DocumentRole);

        // Folders don't have preview/download URLs — skip steps 2 & 3
        if (data.item.type === "FOLDER") {
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
                  "\n\n... [Nội dung quá dài, vui lòng tải xuống để xem toàn bộ] ...",
              );
            } else {
              setTextContent(text);
            }
          } catch (textErr) {
            console.error(textErr);
            if (active) {
              setTextContent("Không thể tải nội dung tệp văn bản này.");
            }
          } finally {
            if (active) setLoadingText(false);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load shared document", err);
        if (active) {
          const axiosError = err as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          setError(
            axiosError.response?.data?.message ||
              axiosError.message ||
              "Lỗi tải thông tin chia sẻ",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [id]);

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
      toast.error("Không thể tạo liên kết tải xuống");
    }
  };

  const handleRename = () => {
    if (!item) return;
    void Swal.fire({
      title: "Đổi tên tài liệu công khai",
      input: "text",
      inputValue: item.name,
      showCancelButton: true,
      confirmButtonText: "Lưu lại",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "var(--color-primary, #3b82f6)",
      inputValidator: (value) => {
        if (!value) {
          return "Tên không được để trống!";
        }
        return null;
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const updated = await documentsApi.renamePublicItem(item.id, result.value as string);
          setItem(updated);
          toast.success("Đã đổi tên tài liệu");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Lỗi đổi tên tài liệu");
        }
      }
    });
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
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-3 text-slate-500">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <span className="text-sm font-semibold">
          Đang tải thông tin tài liệu...
        </span>
      </div>
    );
  }

  if (error || !item) {
    return <SharedDenied />;
  }

  // ── Folder: render folder browser ─────────────────────────────────────────
  if (item.type === DocumentItemType.FOLDER) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
          onRename={userRole === DocumentRole.EDITOR ? handleRename : undefined}
        />

        {/* Preview Panel */}
        <SharedPreview
          item={item}
          previewUrl={previewUrl}
          textContent={textContent}
          isUrlLoading={isUrlLoading}
          loadingText={loadingText}
          error={error}
          onDownload={handleDownload}
        />
      </main>

      <VersionManagementModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        item={item}
        onPreviewVersion={async (itm, versionId) => {
          try {
            setIsUrlLoading(true);
            const url = await documentsApi.getPublicPreviewUrl(itm.id, versionId);
            setPreviewUrl(url);
            setIsUrlLoading(false);
          } catch (err) {
            console.error("Failed to preview version", err);
            toast.error("Không thể xem trước phiên bản này");
            setIsUrlLoading(false);
          }
        }}
        isPublic={true}
        onVersionUploaded={handleVersionUploaded}
      />
    </div>
  );
}
