"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Lock, Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LinkAccess } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";

interface ShareModalLinkProps {
  documentItemId: string;
  initialLinkAccess: LinkAccess;
  onLinkAccessChanged?: (newAccess: LinkAccess) => void;
  isOwner?: boolean;
}

const LINK_ACCESS_LABELS: Record<LinkAccess, string> = {
  [LinkAccess.NONE]: "Restricted",
  [LinkAccess.VIEWER]: "Anyone with the link (Viewer)",
  [LinkAccess.EDITOR]: "Anyone with the link (Editor)",
};

const LINK_ACCESS_DESCRIPTIONS: Record<LinkAccess, string> = {
  [LinkAccess.NONE]: "Only people with granted access can open with this link",
  [LinkAccess.VIEWER]: "Anyone on the internet with this link can view this item",
  [LinkAccess.EDITOR]: "Anyone on the internet with this link can edit this item",
};

export function ShareModalLink({
  documentItemId,
  initialLinkAccess,
  onLinkAccessChanged,
  isOwner = false,
}: ShareModalLinkProps) {
  const [linkAccess, setLinkAccess] = useState<LinkAccess>(initialLinkAccess);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setLinkAccess(initialLinkAccess);
  }, [initialLinkAccess]);

  const queryClient = useQueryClient();

  const updateLinkAccessMutation = useMutation({
    mutationFn: (newAccess: LinkAccess) =>
      documentsApi.updateLinkAccess(documentItemId, newAccess),
    onSuccess: (updatedItem) => {
      const newAccess = updatedItem.linkAccess as LinkAccess;
      setLinkAccess(newAccess);
      onLinkAccessChanged?.(newAccess);
      toast.success("General access updated.");
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },
    onError: (err) => {
      console.error("Failed to update link access", err);
      toast.error("Failed to update access configurations.");
    },
  });

  const handleLinkAccessChange = useCallback(
    (newAccess: LinkAccess) => {
      updateLinkAccessMutation.mutate(newAccess);
    },
    [updateLinkAccessMutation],
  );

  const handleCopyLink = useCallback(() => {
    const shareUrl = `${window.location.origin}/documents/shared/${documentItemId}`;
    void navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  }, [documentItemId]);

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        General access
      </h4>
      <div className="flex items-start gap-3 bg-background border border-border rounded-panel p-4">
        <div
          className={cn(
            "p-2.5 rounded-panel shrink-0 mt-0.5",
            linkAccess === LinkAccess.NONE
              ? "bg-warning-soft text-warning"
              : "bg-success-soft text-success",
          )}
        >
          {linkAccess === LinkAccess.NONE ? (
            <Lock size={18} />
          ) : (
            <Globe size={18} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {isOwner ? (
              <select
                value={linkAccess}
                onChange={(e) =>
                  void handleLinkAccessChange(e.target.value as LinkAccess)
                }
                className="bg-transparent border border-input rounded-lg -ml-1 py-0.5 px-1.5 text-sm font-semibold text-foreground outline-hidden focus:ring-1 focus:ring-ring transition-all cursor-pointer"
              >
                {Object.entries(LINK_ACCESS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-semibold text-foreground py-0.5 px-1.5 block -ml-1.5">
                {LINK_ACCESS_LABELS[linkAccess]}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-1 leading-normal">
            {LINK_ACCESS_DESCRIPTIONS[linkAccess]}
          </p>
        </div>
      </div>

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        className="flex items-center justify-center gap-2 w-full rounded-control bg-background hover:bg-muted border border-border hover:border-border text-foreground px-4 py-3 text-xs font-semibold transition-all cursor-pointer"
      >
        {isCopied ? (
          <>
            <Check size={14} className="text-success" />
            <span className="text-success">Link copied!</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Copy share link</span>
          </>
        )}
      </button>
    </div>
  );
}
