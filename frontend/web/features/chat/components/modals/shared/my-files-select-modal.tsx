"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, FileText, X, ChevronRight, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { DocumentItem } from "@/features/documents/types/documents.types";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { formatFileSize } from "@/lib/format-file-size";

interface MyFilesSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  overlayClassName?: string;
  tone?: "light" | "dark";
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
  overlayClassName = "z-50",
  tone = "light",
  onSelect,
}: MyFilesSelectModalProps) {
  const isDarkTone = tone === "dark";
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
    <div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center p-4 animate-in fade-in duration-200 ${
        isDarkTone
          ? "bg-black/70 backdrop-blur-sm"
          : "bg-slate-900/50 backdrop-blur-xs"
      }`}
    >
      <div
        className={`w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[500px] ${
          isDarkTone
            ? "rounded-lg border border-white/10 bg-[#0d1420] text-slate-100"
            : "rounded-3xl bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex justify-between items-center px-6 py-4 border-b ${
            isDarkTone ? "border-white/10" : "border-gray-100"
          }`}
        >
          <h2
            className={`text-lg font-black ${
              isDarkTone ? "text-slate-100" : "text-gray-800"
            }`}
          >
            Select from My Files
          </h2>
          <button
            onClick={handleCloseModal}
            className={`cursor-pointer p-2 rounded-full transition-colors ${
              isDarkTone
                ? "text-slate-400 hover:bg-white/10 hover:text-slate-100"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Breadcrumbs Navigation */}
        <div
          className={`flex items-center gap-1.5 px-6 py-3 border-b overflow-x-auto scrollbar-none ${
            isDarkTone
              ? "border-white/10 bg-white/5"
              : "border-gray-50 bg-gray-50/50"
          }`}
        >
          {folderHistory.map((history, idx) => (
            <React.Fragment key={history.id || "root"}>
              {idx > 0 && (
                <ChevronRight
                  size={14}
                  className={`shrink-0 ${
                    isDarkTone ? "text-slate-500" : "text-gray-400"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => handleNavigateToFolder(history.id, history.name)}
                className={`cursor-pointer text-xs font-bold whitespace-nowrap transition-colors ${
                  isDarkTone
                    ? "hover:text-sky-300"
                    : "hover:text-blue-600"
                } ${
                  idx === folderHistory.length - 1
                    ? isDarkTone
                      ? "text-slate-100 font-extrabold"
                      : "text-gray-800 font-extrabold"
                    : isDarkTone
                      ? "text-slate-500"
                      : "text-gray-400"
                }`}
              >
                {history.id === null
                  ? "My Files"
                  : history.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[220px]">
          {isLoading ? (
            <div
              className={`flex items-center justify-center h-full text-xs font-semibold ${
                isDarkTone ? "text-slate-400" : "text-gray-400"
              }`}
            >
              Loading files...
            </div>
          ) : items.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center h-full text-xs font-semibold space-y-2 py-8 ${
                isDarkTone ? "text-slate-400" : "text-gray-400"
              }`}
            >
              <Folder
                size={32}
                className={isDarkTone ? "text-slate-600" : "text-gray-300"}
              />
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
                    className={`cursor-pointer w-full flex items-center justify-between p-3 rounded-xl border border-transparent transition-all text-left ${
                      isDarkTone
                        ? "hover:border-white/10 hover:bg-white/8"
                        : "hover:border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder
                        size={18}
                        className={`shrink-0 ${
                          isDarkTone
                            ? "fill-sky-500/10 text-sky-300"
                            : "fill-blue-50 text-blue-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold truncate pr-4 ${
                          isDarkTone ? "text-slate-100" : "text-gray-700"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 ${
                        isDarkTone ? "text-slate-500" : "text-gray-400"
                      }`}
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
                      isDarkTone
                        ? isSelected
                          ? "border-sky-300/40 bg-sky-500/15"
                          : "border-white/10 bg-white/5 hover:bg-white/8"
                        : isSelected
                          ? "bg-blue-50/50 border-blue-200"
                          : "bg-white border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                          isDarkTone
                            ? isSelected
                              ? "border-sky-400 bg-sky-500 text-white"
                              : "border-white/20 bg-black/20"
                            : isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <FileText
                        size={18}
                        className={`shrink-0 ${
                          isDarkTone ? "text-slate-300" : "text-slate-500"
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-xs font-bold truncate pr-4 ${
                            isDarkTone ? "text-slate-100" : "text-gray-700"
                          }`}
                        >
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            isDarkTone ? "text-slate-400" : "text-gray-400"
                          }`}
                        >
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
        <div
          className={`flex justify-end gap-3 px-6 py-4 border-t ${
            isDarkTone
              ? "border-white/10 bg-white/5"
              : "border-gray-100 bg-gray-50/50"
          }`}
        >
          <button
            type="button"
            onClick={handleCloseModal}
            className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-xl transition ${
              isDarkTone
                ? "text-slate-300 hover:bg-white/10 hover:text-slate-100"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAttachSelected}
            disabled={selectedFiles.size === 0}
            className={`cursor-pointer px-5 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-md hover:shadow-lg disabled:shadow-none ${
              isDarkTone
                ? "bg-sky-500 hover:bg-sky-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {`Attach Selected (${selectedFiles.size})`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


