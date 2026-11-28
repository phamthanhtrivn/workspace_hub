"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, Folder, HardDrive } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  DocumentItem,
  PaginatedResponse,
  UserStorageQuota,
} from "@/features/documents/types/documents.types";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { Progress } from "@/components/ui/progress";
import {
  DashboardPanel,
  EmptyState,
  QueryFeedback,
} from "../common/dashboard-panel";
import { DASHBOARD_ACCENTS } from "../../constants/dashboard-appearance";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** index;

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function DashboardDocuments({
  documentsQuery,
  quotaQuery,
  zone,
}: {
  documentsQuery: UseQueryResult<PaginatedResponse<DocumentItem[]>>;
  quotaQuery: UseQueryResult<UserStorageQuota>;
  zone: string;
}) {
  const items = documentsQuery.data?.data.slice(0, 4) ?? [];
  const totalItems = documentsQuery.data?.meta?.totalItems ?? items.length;
  const quota = quotaQuery.data;
  const usedPct =
    quota && quota.maxBytes > 0
      ? Math.min(100, Math.round((quota.usedBytes / quota.maxBytes) * 100))
      : 0;

  return (
    <DashboardPanel
      title="Documents & Storage"
      href="/documents"
      icon={HardDrive}
      iconClassName={DASHBOARD_ACCENTS.documents}
      description={
        documentsQuery.isSuccess
          ? `${totalItems} ${totalItems === 1 ? "item" : "items"} in your workspace`
          : "Recent files and storage usage"
      }
      height="content"
    >
      <QueryFeedback query={quotaQuery} label="storage quota" />
      {quota && (
        <div className="mb-4 rounded-control border border-border bg-muted/40 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-muted-foreground">
              Storage used
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatBytes(quota.usedBytes)} / {formatBytes(quota.maxBytes)} (
              {usedPct}%)
            </span>
          </div>
          <Progress
            value={usedPct}
            aria-label="Storage quota used"
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${usedPct}%` }}
            />
          </Progress>
        </div>
      )}
      <QueryFeedback query={documentsQuery} label="recent documents" />
      {documentsQuery.isSuccess && !items.length && (
        <EmptyState>
          No documents uploaded yet. Open Documents to add files.
        </EmptyState>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((doc) => {
            const isFolder = doc.type === DocumentItemType.FOLDER;
            const ItemIcon = isFolder ? Folder : FileText;

            return (
              <li key={doc.id}>
                <Link
                  href="/documents"
                  className="group flex items-center justify-between gap-2.5 rounded-control border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-control ${DASHBOARD_ACCENTS.documents}`}
                    >
                      <ItemIcon aria-hidden="true" className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground group-hover:text-link">
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {isFolder ? "Folder" : formatBytes(doc.sizeBytes)} ·{" "}
                        {new Intl.DateTimeFormat("en", {
                          timeZone: zone,
                          month: "short",
                          day: "numeric",
                        }).format(new Date(doc.updatedAt))}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground group-hover:text-link"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
