"use client";

import { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Plus,
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { Task } from "@/features/project/types/project";
import { formatFileSize } from "../ui/project-file-panel";

interface TaskLocalAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  dataUrl?: string;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return <ImageIcon className="h-4 w-4 shrink-0 text-sky-500" />;
  }
  if (["pdf"].includes(ext)) {
    return <FileText className="h-4 w-4 shrink-0 text-rose-500" />;
  }
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-500" />;
  }
  if (
    ["js", "ts", "tsx", "jsx", "py", "json", "html", "css", "sql"].includes(ext)
  ) {
    return <FileCode className="h-4 w-4 shrink-0 text-amber-500" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive className="h-4 w-4 shrink-0 text-indigo-500" />;
  }
  return <FileText className="h-4 w-4 shrink-0 text-slate-400" />;
}

interface TaskAttachmentsSectionProps {
  task: Task;
  isReadOnly?: boolean;
}

export default function TaskAttachmentsSection({
  task,
  isReadOnly = false,
}: TaskAttachmentsSectionProps) {
  const intl = useAppIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const storageKey = `task_attachments_ui_${task.id}`;
  const [attachments, setAttachments] = useState<TaskLocalAttachment[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setAttachments(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveAttachments = (items: TaskLocalAttachment[]) => {
    setAttachments(items);
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleFiles = async (files: File[]) => {
    if (isReadOnly || !files.length) return;

    const newItems: TaskLocalAttachment[] = await Promise.all(
      files.map(async (file) => {
        let dataUrl: string | undefined = undefined;
        if (file.size <= 2 * 1024 * 1024) {
          try {
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve("");
              reader.readAsDataURL(file);
            });
          } catch {
            dataUrl = undefined;
          }
        }

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: new Date().toISOString(),
          dataUrl,
        };
      }),
    );

    const updated = [...attachments, ...newItems];
    saveAttachments(updated);
    toast.success(intl.formatMessage({ id: "project.file.uploaded" }));
  };

  const handleDownload = (item: TaskLocalAttachment) => {
    if (item.dataUrl) {
      const link = document.createElement("a");
      link.href = item.dataUrl;
      link.download = item.name;
      link.click();
    } else {
      const blob = new Blob(["File content preview"], {
        type: item.type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (isReadOnly) return;
    const updated = attachments.filter((item) => item.id !== id);
    saveAttachments(updated);
    toast.success(intl.formatMessage({ id: "project.file.delete" }, { name }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isReadOnly) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isReadOnly) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      void handleFiles(droppedFiles);
    }
  };

  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
          <span>{intl.formatMessage({ id: "project.task.attachments" })}</span>
          <span className="text-[10px] font-normal normal-case text-slate-400">
            ({intl.formatMessage({ id: "project.task.attachmentsUiOnly" })})
          </span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              {attachments.length}
            </span>
          )}
        </h3>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[#0052CC] transition hover:bg-blue-50"
            title={intl.formatMessage({ id: "project.file.add" })}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{intl.formatMessage({ id: "project.file.add" })}</span>
          </button>
        )}
      </div>

      {attachments.length > 0 ? (
        <div className="space-y-2">
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2.5 px-3 py-2 text-xs transition hover:bg-slate-50/80"
              >
                {getFileIcon(file.name)}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-700 hover:text-[#0052CC]">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="grid h-7 w-7 place-items-center rounded text-slate-400 transition hover:bg-blue-50 hover:text-[#0052CC]"
                    title={intl.formatMessage(
                      { id: "project.file.download" },
                      { name: file.name },
                    )}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id, file.name)}
                      className="grid h-7 w-7 place-items-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      title={intl.formatMessage(
                        { id: "project.file.delete" },
                        { name: file.name },
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Quick Dropzone when files already exist */}
          {!isReadOnly && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium transition ${
                isDragOver
                  ? "border-[#0052CC] bg-blue-50/50 text-[#0052CC]"
                  : "border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>
                {intl.formatMessage({ id: "project.task.chooseFiles" })}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Empty State Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={isReadOnly ? undefined : () => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition ${
            isReadOnly
              ? "cursor-default border-slate-200 bg-slate-50/50"
              : isDragOver
                ? "cursor-pointer border-[#0052CC] bg-blue-50/50 text-[#0052CC]"
                : "cursor-pointer border-slate-200 bg-slate-50/50 text-slate-500 hover:border-[#0052CC] hover:bg-blue-50/30"
          }`}
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-xs ring-1 ring-slate-200">
            <Paperclip className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">
              {intl.formatMessage({ id: "project.file.empty" })}
            </p>
            {!isReadOnly && (
              <p className="mt-0.5 text-[11px] text-slate-400">
                {intl.formatMessage({ id: "project.task.chooseFiles" })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        disabled={isReadOnly}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length) void handleFiles(files);
        }}
      />
    </div>
  );
}
