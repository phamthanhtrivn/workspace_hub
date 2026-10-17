"use client";

import React, { useCallback, useMemo } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentShare } from "../../types/documents.types";
import { SharePermission } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { useBulkUserProfilesByEmailsQuery } from "@/features/user-setting/hooks/useUserSettingQueries";

interface ShareModalListProps {
  documentItemId: string;
  ownerEmail: string;
  shares: DocumentShare[];
  isLoading: boolean;
  onShareUpdated?: () => void;
  isOwner?: boolean;
}

export function ShareModalList({
  documentItemId,
  ownerEmail,
  shares,
  isLoading,
  onShareUpdated,
  isOwner = false,
}: ShareModalListProps) {
  // Collect all emails to fetch profiles in bulk
  const allEmails = useMemo(() => {
    const emails = new Set<string>();
    if (ownerEmail) {
      emails.add(ownerEmail.toLowerCase());
    }
    shares.forEach((share) => {
      if (share.shareWithEmail) {
        emails.add(share.shareWithEmail.toLowerCase());
      }
    });
    return Array.from(emails);
  }, [ownerEmail, shares]);

  // Fetch profiles in batch
  const { data: profilesResponse } =
    useBulkUserProfilesByEmailsQuery(allEmails);

  // Create a profile map for O(1) lookup
  const profilesMap = useMemo(() => {
    const map = new Map<string, { fullName?: string; avatarUrl?: string }>();
    if (profilesResponse?.success && Array.isArray(profilesResponse.data)) {
      profilesResponse.data.forEach((profile) => {
        if (profile.email) {
          map.set(profile.email.toLowerCase(), {
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
          });
        }
      });
    }
    return map;
  }, [profilesResponse]);

  const queryClient = useQueryClient();

  const removeShareMutation = useMutation({
    mutationFn: ({ shareId }: { shareId: string; email: string }) =>
      documentsApi.removeShare(documentItemId, shareId),
    onSuccess: (_, variables) => {
      toast.success(`Revoked access for ${variables.email}`);
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      onShareUpdated?.();
    },
    onError: (err) => {
      console.error("Failed to remove share", err);
      toast.error("Failed to revoke access");
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({
      email,
      permission,
    }: {
      email: string;
      permission: SharePermission;
    }) => documentsApi.addShare(documentItemId, email, permission),
    onSuccess: (_, variables) => {
      toast.success(`Updated permission for ${variables.email}`);
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      onShareUpdated?.();
    },
    onError: (err) => {
      console.error("Failed to update permission", err);
      toast.error("Failed to update access permission");
    },
  });

  const handleRemoveShare = useCallback(
    (shareId: string, email: string) => {
      removeShareMutation.mutate({ shareId, email });
    },
    [removeShareMutation],
  );

  const handleUpdateSharePermission = useCallback(
    (email: string, permission: SharePermission) => {
      updatePermissionMutation.mutate({ email, permission });
    },
    [updatePermissionMutation],
  );

  const ownerProfile = profilesMap.get(ownerEmail.toLowerCase());
  const permissionLabel = (permission: SharePermission | "OWNER") => {
    if (permission === "OWNER") return "Owner";
    if (permission === SharePermission.EDITOR) return "Can edit";
    return "Can view";
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        People with access
      </h4>
      <div className="divide-y divide-border border border-border rounded-panel p-2 max-h-64 overflow-y-auto bg-card">
        {/* Owner Item */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-info-soft text-info flex items-center justify-center text-xs font-semibold uppercase tracking-wider shrink-0 relative overflow-hidden">
              {ownerProfile?.avatarUrl ? (
                <Image
                  src={ownerProfile.avatarUrl}
                  alt={ownerProfile.fullName || ownerEmail}
                  fill
                  sizes="32px"
                  className="object-cover rounded-full"
                />
              ) : (
                (ownerProfile?.fullName || ownerEmail).slice(0, 2)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate max-w-[220px]">
                {ownerProfile?.fullName || ownerEmail}
              </p>
              <p className="text-xs font-semibold text-muted-foreground truncate max-w-[220px]">
                {ownerEmail}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-lg px-2 py-1 uppercase tracking-wide">
            Owner
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          shares.map((share) => {
            const profile = profilesMap.get(share.shareWithEmail.toLowerCase()) || {
              fullName: share.shareWithProfile?.fullName || undefined,
              avatarUrl: share.shareWithProfile?.avatarUrl || undefined,
            };
            return (
              <div
                key={share.id}
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold uppercase tracking-wider shrink-0 relative overflow-hidden">
                    {profile?.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt={profile.fullName || share.shareWithEmail}
                        fill
                        sizes="32px"
                        className="object-cover rounded-full"
                      />
                    ) : (
                      (profile?.fullName || share.shareWithEmail).slice(0, 2)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[220px]">
                      {profile?.fullName || share.shareWithEmail}
                    </p>
                    <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground truncate max-w-[220px]">
                      {share.shareWithEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isOwner ? (
                    <>
                      <select
                        value={share.permission}
                        onChange={(e) =>
                          void handleUpdateSharePermission(
                            share.shareWithEmail,
                            e.target.value as SharePermission,
                          )
                        }
                        className="bg-transparent hover:bg-background border-0 rounded-lg py-1 px-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground outline-hidden transition-all cursor-pointer"
                      >
                        {Object.values(SharePermission).map((value) => (
                          <option key={value} value={value}>
                            {permissionLabel(value)}
                          </option>
                        ))}
                      </select>
                      <button aria-label="Remove sharing access"
                        onClick={() =>
                          handleRemoveShare(share.id, share.shareWithEmail)
                        }
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-soft/50 rounded-control transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-lg px-2.5 py-1 uppercase tracking-wide">
                      {permissionLabel(share.permission)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
