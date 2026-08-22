"use client";

import { useRef } from "react";
import { Download, FilePlus2, FileText, Trash2, UploadCloud, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export interface ProjectFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  scopeLabel: string;
  url: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilePickerButtonProps {
  label?: string;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export function FilePickerButton({ label, onFiles, compact = false }: FilePickerButtonProps) {
  const intl = useAppIntl();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center gap-1.5 rounded border border-blue-200 bg-white font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"}`}
      >
        <FilePlus2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {label ?? intl.formatMessage({ id: "project.files.addFile" })}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
    </>
  );
}

export function createProjectFileItems(files: File[], scopeLabel: string): ProjectFileItem[] {
  return files.map((file) => ({
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    addedAt: new Date().toISOString(),
    scopeLabel,
    url: URL.createObjectURL(file),
  }));
}

export default function ProjectFilePanel({
  files,
  onAddFiles,
  onRemoveFile,
}: {
  files: ProjectFileItem[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: ProjectFileItem) => void;
}) {
  const intl = useAppIntl();

  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-black text-[#172B4D]">
              {intl.formatMessage({ id: "project.files.allProjectFiles" })}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              {intl.formatMessage({ id: "project.files.addedFromSprints" })}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{files.length}</span>
        </div>
        <FilePickerButton
          onFiles={onAddFiles}
          label={intl.formatMessage({ id: "project.files.addToProject" })}
        />
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <FileText className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-xs font-bold text-slate-500">
            {intl.formatMessage({ id: "project.files.empty" })}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {intl.formatMessage({ id: "project.files.emptyHelp" })}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-blue-50 text-blue-600"><FileText className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-700">{file.name}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{formatFileSize(file.size)} · {file.scopeLabel}</p>
              </div>
              <a href={file.url} download={file.name} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-blue-50 hover:text-blue-600" title={intl.formatMessage({ id: "documents.download" })}>
                <Download className="h-3.5 w-3.5" />
              </a>
              <button type="button" onClick={() => onRemoveFile(file)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600" title={intl.formatMessage({ id: "project.files.removeFromList" })}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function FilePreviewModal({ file, onClose }: { file: ProjectFileItem | null; onClose: () => void }) {
  const intl = useAppIntl();

  if (!file) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-base font-black text-[#172B4D]">{file.name}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{formatFileSize(file.size)} · {file.scopeLabel}</p></div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label={intl.formatMessage({ id: "app.close" })}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-xs font-semibold text-slate-400">
          {intl.formatMessage({ id: "project.files.previewArea" })}
        </div>
        <div className="mt-4 flex justify-end"><a href={file.url} download={file.name} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Download className="h-3.5 w-3.5" /> {intl.formatMessage({ id: "project.files.downloadFile" })}</a></div>
      </div>
    </div>
  );
}
