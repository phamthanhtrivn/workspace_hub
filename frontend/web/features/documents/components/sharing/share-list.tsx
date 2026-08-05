"use client";

import React, { useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentShare } from "../../types/documents.types";
import { SharePermission } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import {
  PERMISSION_ROLE_LABELS,
  PERMISSION_ROLE_SHARE,
} from "../../types/documents.constants";

interface ShareModalListProps {
  documentItemId: string;
  ownerEmail: string;
  shares: DocumentShare[];
  isLoading: boolean;
  onShareUpdated: () => void;
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
  const handleRemoveShare = useCallback(
    async (shareId: string, email: string) => {
      try {
        await documentsApi.removeShare(documentItemId, shareId);
        toast.success(`Đã thu hồi quyền truy cập của ${email}`);
        onShareUpdated();
      } catch (err) {
        console.error("Failed to remove share", err);
        toast.error("Không thể thu hồi quyền truy cập");
      }
    },
    [documentItemId, onShareUpdated],
  );

  const handleUpdateSharePermission = useCallback(
    async (email: string, permission: SharePermission) => {
      try {
        await documentsApi.addShare(documentItemId, email, permission);
        toast.success(`Đã cập nhật quyền cho ${email}`);
        onShareUpdated();
      } catch (err) {
        console.error("Failed to update permission", err);
        toast.error("Không thể cập nhật quyền truy cập");
      }
    },
    [documentItemId, onShareUpdated],
  );

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider block">
        Những người có quyền truy cập
      </h4>
      <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl p-2 max-h-48 overflow-y-auto bg-white">
        {/* Owner Item */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black uppercase tracking-wider shrink-0">
              {ownerEmail.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                {ownerEmail}
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                {PERMISSION_ROLE_LABELS["OWNER"]}
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
          shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between p-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black uppercase tracking-wider shrink-0">
                  {share.shareWithEmail.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                    {share.shareWithEmail}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {PERMISSION_ROLE_LABELS[share.permission]}
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
          ))
        )}
      </div>
    </div>
  );
}
