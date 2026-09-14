import React from "react";
import { UploadState } from "../../types/documents.enums";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  uploadState: UploadState;
  uploadProgress: number;
  uploadingFileName: string;
}

function UploadProgress({
  uploadState,
  uploadProgress,
  uploadingFileName,
}: UploadProgressProps) {
  if (uploadState === UploadState.IDLE) {
    return null;
  }

  const getStatusLabel = () => {
    switch (uploadState) {
      case UploadState.INITIATING:
        return "PREPARING...";
      case UploadState.UPLOADING:
        return "UPLOADING...";
      case UploadState.CONFIRMING:
        return "PROCESSING...";
      case UploadState.SUCCESS:
        return "UPLOAD COMPLETE";
      case UploadState.ERROR:
        return "UPLOAD FAILED";
      default:
        return "UPLOADING...";
    }
  };

  return (
    <div className="absolute bottom-6 right-6 z-50 bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-2xl p-5 rounded-2xl w-80 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
          {getStatusLabel()}
        </span>
        <span className="text-xs font-extrabold text-[#0052CC]">
          {uploadProgress}%
        </span>
      </div>

      <div className="text-sm font-bold text-slate-700 truncate mb-3">
        {uploadingFileName}
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/20">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            uploadState === UploadState.ERROR
              ? "bg-red-500"
              : uploadState === UploadState.SUCCESS
                ? "bg-green-500"
                : "bg-[#0052CC]",
          )}
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
    </div>
  );
}

export default React.memo(UploadProgress);
