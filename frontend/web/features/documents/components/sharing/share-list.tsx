"use client";

import React, { useCallback, useMemo } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentShare } from "../../types/documents.types";
import { SharePermission } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { getBulkProfilesByEmails } from "@/features/user-setting/api/user-setting.api";
import {
  PERMISSION_ROLE_LABELS,
  PERMISSION_ROLE_SHARE,
} from "../../types/documents.constants";
import { GoDotFill } from "react-icons/go";

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
  const { data: profilesResponse } = useQuery({
    queryKey: ["user-profiles", allEmails],
    queryFn: () => getBulkProfilesByEmails(allEmails),
    enabled: allEmails.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Create a profile map for O(1) lookup
  const profilesMap = useMemo(() => {
    const map = new Map<string, { fullName?: string; avatarUrl?: string }>();
    if (profilesResponse?.success && Array.isArray(profilesResponse.data)) {
      profilesResponse.data.forEach((p: any) => {
        if (p.email) {
          map.set(p.email.toLowerCase(), {
            fullName: p.fullName,
            avatarUrl: p.avatarUrl,
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
      toast.success(`Đã thu hồi quyền truy cập của ${variables.email}`);
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      onShareUpdated?.();
    },
    onError: (err) => {
      console.error("Failed to remove share", err);
      toast.error("Không thể thu hồi quyền truy cập");
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
      toast.success(`Đã cập nhật quyền cho ${variables.email}`);
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      onShareUpdated?.();
    },
    onError: (err) => {
      console.error("Failed to update permission", err);
      toast.error("Không thể cập nhật quyền truy cập");
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

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider block">
        Những người có quyền truy cập
      </h4>
      <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl p-2 max-h-64 overflow-y-auto bg-white">
        {/* Owner Item */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black uppercase tracking-wider shrink-0 relative overflow-hidden">
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
              <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                {ownerProfile?.fullName || ownerEmail}
              </p>
              <p className="text-[10px] font-bold text-slate-400 truncate max-w-[220px]">
                {ownerEmail}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-lg px-2 py-1 uppercase tracking-wide">
            {PERMISSION_ROLE_LABELS["OWNER"]}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : (
          shares.map((share) => {
            const profile = profilesMap.get(share.shareWithEmail.toLowerCase());
            return (
              <div
                key={share.id}
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black uppercase tracking-wider shrink-0 relative overflow-hidden">
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
                    <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                      {profile?.fullName || share.shareWithEmail}
                    </p>
                    <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400 truncate max-w-[220px]">
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
                        className="bg-transparent hover:bg-slate-50 border-0 rounded-lg py-1 px-1.5 text-xs font-black text-slate-500 hover:text-slate-700 outline-hidden transition-all cursor-pointer"
                      >
                        {Object.entries(PERMISSION_ROLE_SHARE).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      <button
                        onClick={() =>
                          handleRemoveShare(share.id, share.shareWithEmail)
                        }
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-lg px-2.5 py-1 uppercase tracking-wide">
                      {PERMISSION_ROLE_LABELS[share.permission]}
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
