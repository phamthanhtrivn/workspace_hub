"use client";

import React from "react";
import { DocumentItem, DocumentVersion } from "../types/documents.types";
import { formatBytes, formatDateShort } from "../utils/documents.utils";
import { Eye, Download, Loader2 } from "lucide-react";

interface VersionHistoryTableProps {
  versions: DocumentVersion[];
  isLoading: boolean;
  item: DocumentItem;
  onPreviewVersion: (item: DocumentItem, versionId: string) => void;
  onDownload: (versionId: string) => void;
}

export function VersionHistoryTable({
  versions,
  isLoading,
  item,
  onPreviewVersion,
  onDownload,
}: VersionHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="text-slate-400 animate-spin" size={24} />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 font-semibold text-sm">
        Không có dữ liệu phiên bản.
      </div>
    );
  }

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
            <th className="px-5 py-3">Phiên bản</th>
            <th className="px-5 py-3">Thời gian</th>
            <th className="px-5 py-3">Dung lượng</th>
            <th className="px-5 py-3">Người tải</th>
            <th className="px-5 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
          {versions.map((version, index) => {
            const isLatest = index === 0;
            return (
              <tr
                key={version.id}
                className={`hover:bg-slate-50/50 transition-colors ${
                  isLatest ? "bg-blue-50/10 font-bold" : ""
                }`}
              >
                <td className="px-5 py-4 flex items-center gap-2">
                  <span>v{version.versionNumber}</span>
                  {isLatest && (
                    <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-100">
                      Hiện tại
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {formatDateShort(version.createdAt)}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {formatBytes(Number(version.sizeBytes))}
                </td>
                <td
                  className="px-5 py-4 text-slate-600 truncate max-w-[120px]"
                  title={version.uploadedByEmail}
                >
                  {version.uploadedByEmail}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() =>
                        onPreviewVersion(
                          item,
                          version.id === "original" ? "" : version.id,
                        )
                      }
                      title="Xem trước phiên bản"
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-500 rounded-lg cursor-pointer transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => onDownload(version.id)}
                      title="Tải xuống phiên bản"
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-500 rounded-lg cursor-pointer transition-colors"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
