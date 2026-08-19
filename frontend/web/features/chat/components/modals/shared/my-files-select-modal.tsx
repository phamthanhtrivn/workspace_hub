"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, FileText, X, ChevronRight, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { DocumentItem } from "@/features/documents/types/documents.types";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { formatFileSize } from "@/features/project/components/project-file-panel";

interface MyFilesSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    files: Array<{
      name: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    }>,
  ) => void;
}

interface FolderHistoryItem {
  id: string | null;
  name: string;
}

export default function MyFilesSelectModal({
  isOpen,
  onClose,
  onSelect,
}: MyFilesSelectModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<FolderHistoryItem[]>([
    { id: null, name: "Home" },
  ]);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, DocumentItem>>(
    new Map(),
  );

  const { data: response, isLoading } = useQuery({
    queryKey: chatKeys.spaceDetails(
      currentFolderId ? `folder-${currentFolderId}` : "root-documents",
    ),
    queryFn: () =>
      documentsApi.getDocuments({ folderId: currentFolderId || undefined }),
    enabled: isOpen,
  });

  const items = useMemo(() => response?.data || [], [response]);

  const handleNavigateToFolder = useCallback(
    (folderId: string | null, folderName: string) => {
      setCurrentFolderId(folderId);

      if (folderId === null) {
        setFolderHistory([{ id: null, name: "Home" }]);
      } else {
        const index = folderHistory.findIndex((h) => h.id === folderId);
        if (index !== -1) {
          setFolderHistory(folderHistory.slice(0, index + 1));
        } else {
          setFolderHistory((prev) => [
            ...prev,
            { id: folderId, name: folderName },
          ]);
        }
      }
    },
    [folderHistory],
  );

  const handleToggleSelectFile = useCallback((file: DocumentItem) => {
    setSelectedFiles((prev) => {
      const next = new Map(prev);
      if (next.has(file.id)) {
        next.delete(file.id);
      } else {
        next.set(file.id, file);
      }
      return next;
    });
  }, []);

  const handleAttachSelected = useCallback(() => {
    const filesToAttach = Array.from(selectedFiles.values()).map((file) => ({
      name: file.name,
      s3Key: file.s3Key || "",
      mimeType: file.mimeType || "application/octet-stream",
      sizeBytes: file.sizeBytes,
    }));
    onSelect(filesToAttach);
    setSelectedFiles(new Map());
    handleNavigateToFolder(null, "Home");
    onClose();
  }, [selectedFiles, onSelect, onClose, handleNavigateToFolder]);

  const handleCloseModal = useCallback(() => {
    setSelectedFiles(new Map());
    handleNavigateToFolder(null, "Home");
    onClose();
  }, [onClose, handleNavigateToFolder]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">
            Select from My Files
          </h2>
          <button
            onClick={handleCloseModal}
            className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-gray-50 bg-gray-50/50 overflow-x-auto scrollbar-none">
          {folderHistory.map((history, idx) => (
            <React.Fragment key={history.id || "root"}>
              {idx > 0 && (
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => handleNavigateToFolder(history.id, history.name)}
                className={`cursor-pointer text-xs font-bold whitespace-nowrap transition-colors hover:text-blue-600 ${
                  idx === folderHistory.length - 1
                    ? "text-gray-800 font-extrabold"
                    : "text-gray-400"
                }`}
              >
                {history.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[220px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-xs font-semibold text-gray-400">
              Loading files...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-xs font-semibold text-gray-400 space-y-2 py-8">
              <Folder size={32} className="text-gray-300" />
              <span>This folder is empty</span>
            </div>
          ) : (
            items.map((item: DocumentItem) => {
              const isFolder = item.type === DocumentItemType.FOLDER;
              const isFile = item.type === DocumentItemType.FILE;
              const isSelected = selectedFiles.has(item.id);

              if (isFolder) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigateToFolder(item.id, item.name)}
                    className="cursor-pointer w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder
                        size={18}
                        className="text-blue-500 fill-blue-50 shrink-0"
                      />
                      <span className="text-xs font-bold text-gray-700 truncate pr-4">
                        {item.name}
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-gray-400 shrink-0"
                    />
                  </button>
                );
              }

              if (isFile) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleSelectFile(item)}
                    className={`cursor-pointer w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "bg-blue-50/50 border-blue-200"
                        : "bg-white border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <FileText size={18} className="text-slate-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-gray-700 truncate pr-4">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatFileSize(item.sizeBytes)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={handleCloseModal}
            className="cursor-pointer px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAttachSelected}
            disabled={selectedFiles.size === 0}
            className="cursor-pointer px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-md hover:shadow-lg disabled:shadow-none"
          >
            Attach {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
