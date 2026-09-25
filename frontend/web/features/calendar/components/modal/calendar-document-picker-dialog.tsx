"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, FileText, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import type { DocumentItem } from "@/features/documents/types/documents.types";
import { formatBytes } from "@/features/documents/utils/documents.utils";

interface CalendarDocumentPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedItemIds: string[]) => void;
}

export function CalendarDocumentPickerDialog({
  open,
  onOpenChange,
  onConfirm,
}: CalendarDocumentPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["calendar-document-picker", search],
    queryFn: async () => {
      const response = await documentsApi.getDocuments({
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
      });
      return response.data;
    },
    enabled: open,
  });

  const files = useMemo(
    () => (query.data ?? []).filter((item) => item.type === DocumentItemType.FILE),
    [query.data],
  );

  const toggleSelected = (item: DocumentItem) => {
    setSelectedIds((current) =>
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id],
    );
  };

  const handleAttach = () => {
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds);
    setSelectedIds([]);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedIds([]);
          setSearch("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FolderOpen className="h-4 w-4 text-[#0052CC]" />
            Attach from My Files
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 p-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files"
            className="h-9 rounded-lg text-sm"
          />

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {query.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading files...
              </div>
            ) : files.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500">
                No files found.
              </div>
            ) : (
              files.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelected(item)}
                    className={[
                      "flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0",
                      selected ? "bg-blue-50" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                        selected
                          ? "border-[#0052CC] bg-[#0052CC] text-white"
                          : "border-slate-300 bg-white text-transparent",
                      ].join(" ")}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {item.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatBytes(item.sizeBytes)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-lg px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleAttach}
              className="h-8 rounded-lg bg-[#0052CC] px-3 text-xs text-white hover:bg-[#0747A6]"
            >
              Attach {selectedIds.length || ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
