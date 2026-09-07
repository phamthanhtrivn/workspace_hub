"use client";

import { useRef } from "react";
import { Download, FilePlus2, Trash2 } from "lucide-react";
import type { ProjectFile } from "@/features/project/api/project-file.api";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePickerButton({
  onFiles,
  label,
  compact = false,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const intl = useAppIntl();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={`inline-flex items-center gap-1.5 rounded border border-blue-200 bg-white font-semibold text-blue-700 disabled:opacity-50 ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}`}
      >
        <FilePlus2 size={16} />
        {label ?? intl.formatMessage({ id: "project.file.add" })}
      </button>
      <input
        ref={input}
        aria-label={intl.formatMessage({ id: "project.file.choose" })}
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

export default function ProjectFilePanel({
  files,
  isLoading,
  isError,
  busy,
  canUpload,
  canRemove,
  onAddFiles,
  onDownload,
  onRemoveFile,
  onRetry,
  sprintName,
}: {
  files: ProjectFile[];
  isLoading: boolean;
  isError: boolean;
  busy: boolean;
  canUpload: boolean;
  canRemove: (file: ProjectFile) => boolean;
  onAddFiles: (files: File[]) => void;
  onDownload: (file: ProjectFile) => void;
  onRemoveFile: (file: ProjectFile) => void;
  onRetry: () => void;
  sprintName: (id: string) => string;
}) {
  const intl = useAppIntl();
  return (
    <section
      className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm"
      aria-busy={busy || isLoading}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            {intl.formatMessage(
              { id: "project.file.count" },
              { count: files.length },
            )}
          </h2>
          <p className="text-xs text-slate-500">
            {intl.formatMessage({ id: "project.file.limitHint" })}
          </p>
        </div>
        {canUpload && (
          <FilePickerButton
            disabled={busy}
            onFiles={onAddFiles}
            label={intl.formatMessage({
              id: busy ? "app.processing" : "project.file.add",
            })}
          />
        )}
      </div>
      {isLoading ? (
        <p className="p-4 text-sm text-slate-500">
          {intl.formatMessage({ id: "project.file.loading" })}
        </p>
      ) : isError ? (
        <div role="alert" className="p-4 text-sm text-red-600">
          {intl.formatMessage({ id: "project.file.loadFailed" })}{" "}
          <button type="button" onClick={onRetry} className="underline">
            {intl.formatMessage({ id: "app.retry" })}
          </button>
        </div>
      ) : !files.length ? (
        <p className="p-6 text-sm text-slate-500">
          {intl.formatMessage({ id: "project.file.empty" })}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {intl.formatMessage(
                    { id: "project.file.meta" },
                    {
                      size: intl.formatNumber(
                        Math.max(1, Math.ceil(file.size / 1024)),
                      ),
                      scope: file.sprintId
                        ? sprintName(file.sprintId)
                        : intl.formatMessage({ id: "project.label" }),
                    },
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDownload(file)}
                aria-label={intl.formatMessage(
                  { id: "project.file.download" },
                  { name: file.name },
                )}
                className="p-2 text-blue-600 disabled:opacity-50"
              >
                <Download size={16} />
              </button>
              {canRemove(file) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemoveFile(file)}
                  aria-label={intl.formatMessage(
                    { id: "project.file.delete" },
                    { name: file.name },
                  )}
                  className="p-2 text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
