"use client";

import { IconButton } from "@/components/ui/icon-button";

import React from "react";
import { DocumentItem, DocumentVersion } from "../../types/documents.types";
import { formatBytes, formatDateShort } from "../../utils/documents.utils";
import { ORIGINAL_VERSION_ID } from "../../types/documents.constants";
import { Eye, Download } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";


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
      <div role="status" className="flex justify-center items-center py-10">
        <Spinner size={24} />
      <span className="sr-only">Loading…</span></div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-semibold text-sm">
        No version history available
      </div>
    );
  }

  return (
    <div className="border border-border rounded-panel overflow-x-auto">
      <Table unstyled className="w-full text-left border-collapse text-xs">
        <TableHeader unstyled>
          <TableRow unstyled className="bg-background border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
            <TableHead unstyled className="px-5 py-3">Version</TableHead>
            <TableHead unstyled className="px-5 py-3">Date</TableHead>
            <TableHead unstyled className="px-5 py-3">Size</TableHead>
            <TableHead unstyled className="px-5 py-3">Uploaded By</TableHead>
            <TableHead unstyled className="px-5 py-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody unstyled className="divide-y divide-border font-semibold text-foreground">
          {versions.map((version, index) => {
            const isLatest = index === 0;
            return (
              <TableRow unstyled
                key={version.id}
                className={`hover:bg-background transition-colors ${
                  isLatest ? "bg-info-soft/10 font-semibold" : ""
                }`}
              >
                <TableCell unstyled className="px-5 py-4 flex items-center gap-2">
                  <span>v{version.versionNumber}</span>
                  {isLatest && (
                    <span className="bg-info-soft text-info-content text-xs px-2 py-0.5 rounded-full font-semibold border border-border">
                      Current
                    </span>
                  )}
                </TableCell>
                <TableCell unstyled className="px-5 py-4 text-muted-foreground">
                  {formatDateShort(version.createdAt)}
                </TableCell>
                <TableCell unstyled className="px-5 py-4 text-muted-foreground">
                  {formatBytes(Number(version.sizeBytes))}
                </TableCell>
                <TableCell unstyled
                  className="px-5 py-4 text-muted-foreground truncate max-w-[120px]"
                  title={version.uploadedByEmail}
                >
                  {version.uploadedByEmail}
                </TableCell>
                <TableCell unstyled className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <IconButton label="Preview version" showTooltip={false} size="icon-sm"
                      onClick={() =>
                        onPreviewVersion(
                          item,
                          version.id === ORIGINAL_VERSION_ID ? "" : version.id,
                        )
                      }
                      title="Preview version"
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-info-content rounded-control cursor-pointer transition-colors"
                    >
                      <Eye size={15} />
                    </IconButton>
                    <IconButton label="Download version" showTooltip={false} size="icon-sm"
                      onClick={() => onDownload(version.id)}
                      title="Download version"
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-info-content rounded-control cursor-pointer transition-colors"
                    >
                      <Download size={15} />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
