"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { documentsApi } from "../../api/documents.api";
import { DocumentItemType } from "../../types/documents.enums";

interface DocumentsFolderTreeProps {
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

function FolderBranch({
  folderId,
  name,
  depth,
  currentFolderId,
  expandedIds,
  onToggleExpand,
  onSelectFolder,
}: {
  folderId: string;
  name: string;
  depth: number;
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
}) {
  const expanded = expandedIds.has(folderId);
  const active = currentFolderId === folderId;

  const childrenQuery = useQuery({
    queryKey: ["documents", "folder-tree", folderId],
    queryFn: ({ signal }) =>
      documentsApi.getDocuments(
        {
          folderId,
          itemType: DocumentItemType.FOLDER,
          limit: 50,
        },
        signal,
      ),
    enabled: expanded,
    staleTime: 30_000,
  });

  const children = childrenQuery.data?.data ?? [];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-control pr-2 py-1 text-xs transition-colors",
          active
            ? "bg-info-soft font-semibold text-info-content"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onToggleExpand(folderId)}
          aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
          className="size-5 shrink-0 rounded p-0 text-muted-foreground hover:bg-accent"
        >
          {expanded ? (
            <ChevronDown className="size-3" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-3" aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="unstyled"
          onClick={() => {
            onSelectFolder(folderId);
            if (!expanded) onToggleExpand(folderId);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left"
        >
          {expanded ? (
            <FolderOpen
              className={cn(
                "size-3.5 shrink-0",
                active ? "text-info-content" : "text-warning-content",
              )}
              aria-hidden="true"
            />
          ) : (
            <Folder
              className={cn(
                "size-3.5 shrink-0",
                active ? "text-info-content" : "text-warning-content",
              )}
              aria-hidden="true"
            />
          )}
          <span className="truncate">{name}</span>
        </Button>
      </div>

      {expanded && children.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <FolderBranch
              key={child.id}
              folderId={child.id}
              name={child.name}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const DocumentsFolderTree = React.memo(function DocumentsFolderTree({
  currentFolderId,
  onSelectFolder,
}: DocumentsFolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const rootFoldersQuery = useQuery({
    queryKey: ["documents", "folder-tree", "root"],
    queryFn: ({ signal }) =>
      documentsApi.getDocuments(
        {
          itemType: DocumentItemType.FOLDER,
          limit: 50,
        },
        signal,
      ),
    staleTime: 30_000,
  });

  const rootFolders = rootFoldersQuery.data?.data ?? [];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  if (!rootFoldersQuery.isLoading && rootFolders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 border-t border-border pt-3">
      <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Folders
      </span>

      {rootFolders.length > 0 && (
        <div className="space-y-0.5">
          {rootFolders.map((folder) => (
            <FolderBranch
              key={folder.id}
              folderId={folder.id}
              name={folder.name}
              depth={0}
              currentFolderId={currentFolderId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});
