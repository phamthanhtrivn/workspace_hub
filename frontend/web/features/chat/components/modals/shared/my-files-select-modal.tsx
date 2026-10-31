"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { copyDocumentsToChat, type AttachmentChatContext } from "../../../api/document-attachment.api";
import { useQuery } from "@tanstack/react-query";
import { Folder, FileText, X, ChevronRight, Check } from "lucide-react";

import { DocumentItem } from "@/features/documents/types/documents.types";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { formatFileSize } from "@/lib/format-file-size";
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";


interface MyFilesSelectModalProps {
  context: AttachmentChatContext;
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
  context,
  isOpen,
  onClose,
  overlayClassName = "z-50",
  tone = "light",
  onSelect,
}: MyFilesSelectModalProps) {
  const isDarkTone = tone === "dark";
  const [isPreparing, setIsPreparing] = useState(false);
  const preparation = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => { preparation.current?.abort(); };
  }, [context.chatId, context.chatType, isOpen]);
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

  const handleAttachSelected = useCallback(async () => {
    if (isPreparing) return;
    const controller = new AbortController();
    preparation.current = controller;
    setIsPreparing(true);
    try {
      const attachments = await copyDocumentsToChat(Array.from(selectedFiles.values()), context, controller.signal);
      controller.signal.throwIfAborted();
      onSelect(attachments);
      setSelectedFiles(new Map());
      handleNavigateToFolder(null, "Home");
      onClose();
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "Could not attach the selected documents.");
    } finally {
      if (preparation.current === controller) {
        preparation.current = null;
        setIsPreparing(false);
      }
    }
  }, [selectedFiles, context, isPreparing, onSelect, onClose, handleNavigateToFolder]);

  const handleCloseModal = useCallback(() => {
    preparation.current?.abort();
    setSelectedFiles(new Map());
    handleNavigateToFolder(null, "Home");
    onClose();
  }, [onClose, handleNavigateToFolder]);

  if (!isOpen) return null;

  return <DialogSurface onClose={onClose}>{<div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center p-4 animate-in fade-in duration-200 ${
        isDarkTone
          ? "bg-overlay/70"
          : "bg-overlay/50"
      }`}
    >
      <div
        className={`${dialogLayout.surface} w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[500px] ${
          isDarkTone
            ? "rounded-lg border border-border bg-card text-muted-foreground"
            : "rounded-dialog bg-card"
        }`}
      >
        {/* Header */}
        <div
          className={`flex justify-between items-center px-6 py-4 border-b ${
            isDarkTone ? "border-border/10" : "border-border"
          }`}
        >
          <h2
            className={`text-lg font-semibold ${
              isDarkTone ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            Select from My Files
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={handleCloseModal}
            className={`cursor-pointer p-2 rounded-full transition-colors ${
              isDarkTone
                ? "text-muted-foreground hover:bg-accent hover:text-muted-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <X size={18} />
          </Button>
        </div>

        {/* Breadcrumbs Navigation */}
        <div
          className={`flex items-center gap-1.5 px-6 py-3 border-b overflow-x-auto ${
            isDarkTone
              ? "border-border bg-accent"
              : "border-border bg-background"
          }`}
        >
          {folderHistory.map((history, idx) => (
            <React.Fragment key={history.id || "root"}>
              {idx > 0 && (
                <ChevronRight
                  size={14}
                  className={`shrink-0 ${
                    isDarkTone ? "text-muted-foreground" : "text-muted-foreground"
                  }`}
                />
              )}
              <Button variant="unstyled"
                type="button"
                onClick={() => handleNavigateToFolder(history.id, history.name)}
                className={`cursor-pointer text-xs font-semibold whitespace-nowrap transition-colors ${
                  isDarkTone
                    ? "hover:text-info-content"
                    : "hover:text-info-content"
                } ${
                  idx === folderHistory.length - 1
                    ? isDarkTone
                      ? "text-muted-foreground font-semibold"
                      : "text-foreground font-semibold"
                    : isDarkTone
                      ? "text-muted-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {history.id === null
                  ? "My Files"
                  : history.name}
              </Button>
            </React.Fragment>
          ))}
        </div>

        {/* Content List Area */}
        <div className={`${dialogLayout.body} flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[220px]`}>
          {isLoading ? (
            <LoadingState label="Loading files..." layout="centered" className={`flex items-center justify-center h-full text-xs font-semibold ${
                isDarkTone ? "text-muted-foreground" : "text-muted-foreground"
              }`} />
          ) : items.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center h-full text-xs font-semibold space-y-2 py-8 ${
                isDarkTone ? "text-muted-foreground" : "text-muted-foreground"
              }`}
            >
              <Folder
                size={32}
                className={isDarkTone ? "text-muted-foreground" : "text-muted-foreground"}
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
                  <Button variant="unstyled"
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigateToFolder(item.id, item.name)}
                    className={`cursor-pointer w-full flex items-center justify-between p-3 rounded-control border border-transparent transition-all text-left ${
                      isDarkTone
                        ? "hover:border-border hover:bg-accent"
                        : "hover:border-border hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder
                        size={18}
                        className={`shrink-0 ${
                          isDarkTone
                            ? "fill-info-content/10 text-info-content"
                            : "fill-info-content text-info-content"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold truncate pr-4 ${
                          isDarkTone ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 ${
                        isDarkTone ? "text-muted-foreground" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                );
              }

              if (isFile) {
                return (
                  <Button variant="unstyled"
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleSelectFile(item)}
                    className={`cursor-pointer w-full flex items-center justify-between p-3 rounded-control border transition-all text-left ${
                      isDarkTone
                        ? isSelected
                          ? "border-info-outline/40 bg-primary/15"
                          : "border-border bg-accent hover:bg-accent"
                        : isSelected
                          ? "bg-info-soft/50 border-border"
                          : "bg-card border-border hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                          isDarkTone
                            ? isSelected
                              ? "border-info-outline bg-primary text-primary-foreground"
                              : "border-border bg-overlay/20"
                            : isSelected
                              ? "bg-primary border-info-outline text-primary-foreground"
                              : "border-input bg-card"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <FileText
                        size={18}
                        className={`shrink-0 ${
                          isDarkTone ? "text-muted-foreground" : "text-muted-foreground"
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-xs font-semibold truncate pr-4 ${
                            isDarkTone ? "text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {item.name}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            isDarkTone ? "text-muted-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {formatFileSize(item.sizeBytes)}
                        </span>
                      </div>
                    </div>
                  </Button>
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
              ? "border-border bg-accent"
              : "border-border bg-background"
          }`}
        >
          <Button variant="unstyled"
            type="button"
            onClick={handleCloseModal}
            className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-control transition ${
              isDarkTone
                ? "text-muted-foreground hover:bg-accent hover:text-muted-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Cancel
          </Button>
          <Button variant="unstyled"
            type="button"
            onClick={handleAttachSelected}
            disabled={selectedFiles.size === 0 || isPreparing}
            className={`cursor-pointer px-5 py-2 text-xs font-semibold text-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-control transition disabled:shadow-none ${
              isDarkTone
                ? "bg-primary hover:bg-primary"
                : "bg-primary hover:bg-primary"
            }`}
          >
            {isPreparing ? "Preparing attachments…" : `Attach Selected (${selectedFiles.size})`}
          </Button>
        </div>
      </div>
    </div>}</DialogSurface>;
}


