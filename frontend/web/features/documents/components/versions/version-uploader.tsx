"use client";

import React from "react";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { UploadState } from "../../types/documents.enums";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface VersionUploaderProps {
  uploadState: UploadState;
  uploadProgress: number;
  uploadingFileName: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileSelect: () => void;
}

export function VersionUploader({
  uploadState,
  uploadProgress,
  uploadingFileName,
  fileInputRef,
  onFileChange,
  onTriggerFileSelect,
}: VersionUploaderProps) {
  const intl = useAppIntl();
  const uploadStatusMessageIds: Partial<Record<UploadState, string>> = {
    [UploadState.INITIATING]: "documents.upload.initiating",
    [UploadState.UPLOADING]: "documents.uploadingToStorage",
    [UploadState.CONFIRMING]: "documents.confirmingNewVersion",
    [UploadState.SUCCESS]: "documents.versionUploadedSuccessfully",
    [UploadState.ERROR]: "documents.uploadErrorOccurred",
  };
  const statusMessageId = uploadStatusMessageIds[uploadState];

  return (
    <div className="mb-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />
      {uploadState === UploadState.IDLE ? (
        <div
          onClick={onTriggerFileSelect}
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-slate-50/50 hover:border-blue-400 cursor-pointer transition-all duration-200 group"
        >
          <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-all duration-200 mb-3">
            <UploadCloud size={24} />
          </div>
          <span className="text-sm font-black text-slate-700">
            {intl.formatMessage({ id: "documents.uploadNewVersion" })}
          </span>
          <span className="text-xs text-slate-400 font-bold mt-1">
            {intl.formatMessage({ id: "documents.oldVersionsKeptSafely" })}
          </span>
        </div>
      ) : (
        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {uploadState === UploadState.SUCCESS ? (
                <CheckCircle2
                  size={16}
                  className="text-green-500 shrink-0"
                />
              ) : (
                <Loader2
                  size={16}
                  className="text-blue-500 animate-spin shrink-0"
                />
              )}
              <span className="text-xs font-black text-slate-700 truncate max-w-xs">
                {uploadingFileName}
              </span>
            </div>
            <span className="text-xs font-black text-slate-500">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">
            {statusMessageId ? intl.formatMessage({ id: statusMessageId }) : null}
          </p>
        </div>
      )}
    </div>
  );
}
