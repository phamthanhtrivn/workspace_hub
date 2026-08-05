"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Lock, Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LinkAccess } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";

interface ShareModalLinkProps {
  documentItemId: string;
  initialLinkAccess: LinkAccess;
  onLinkAccessChanged: (newAccess: LinkAccess) => void;
  isOwner?: boolean;
}

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

  const handleLinkAccessChange = useCallback(
    async (newAccess: LinkAccess) => {
      try {
        await documentsApi.updateLinkAccess(documentItemId, newAccess);
        setLinkAccess(newAccess);
        onLinkAccessChanged(newAccess);
        toast.success("Đã cập nhật quyền truy cập chung");
      } catch (err) {
        console.error("Failed to update link access", err);
        toast.error("Không thể cập nhật cấu hình liên kết");
      }
    },
    [documentItemId, onLinkAccessChanged]
  );

  const handleCopyLink = useCallback(() => {
    const shareUrl = `${window.location.origin}/documents/shared/${documentItemId}`;
    void navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success("Đã sao chép liên kết vào bộ nhớ tạm");
    setTimeout(() => setIsCopied(false), 2000);
  }, [documentItemId]);

  return (
    <div className="space-y-3 pt-4 border-t border-slate-100">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider block">
        Quyền truy cập chung
      </h4>
      <div className="flex items-start gap-3 bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
        <div
          className={cn(
            "p-2.5 rounded-xl shrink-0 mt-0.5",
            linkAccess === LinkAccess.NONE ? "bg-amber-50 text-amber-500" : "bg-green-50 text-green-600"
          )}
        >
          {linkAccess === LinkAccess.NONE ? <Lock size={18} /> : <Globe size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {isOwner ? (
              <select
                value={linkAccess}
                onChange={(e) => void handleLinkAccessChange(e.target.value as LinkAccess)}
                className="bg-transparent border-0 rounded-lg -ml-1 py-0.5 px-1.5 text-sm font-black text-slate-800 outline-hidden focus:ring-1 focus:ring-slate-100 transition-all cursor-pointer"
              >
                <option value={LinkAccess.NONE}>Hạn chế</option>
                <option value={LinkAccess.VIEWER}>Bất kỳ ai có liên kết (Xem)</option>
                <option value={LinkAccess.EDITOR}>Bất kỳ ai có liên kết (Sửa)</option>
              </select>
            ) : (
              <span className="text-sm font-black text-slate-800 py-0.5 px-1.5 block -ml-1.5">
                {linkAccess === LinkAccess.NONE
                  ? "Hạn chế"
                  : linkAccess === LinkAccess.VIEWER
                  ? "Bất kỳ ai có liên kết (Xem)"
                  : "Bất kỳ ai có liên kết (Sửa)"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1 leading-normal">
            {linkAccess === LinkAccess.NONE
              ? "Chỉ những người được thêm ở trên mới có thể truy cập bằng liên kết này."
              : linkAccess === LinkAccess.VIEWER
              ? "Bất kỳ ai có liên kết này đều có thể xem và tải xuống tài nguyên."
              : "Bất kỳ ai có liên kết này đều có quyền chỉnh sửa, di chuyển và xóa tài nguyên."}
          </p>
        </div>
      </div>

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-200 text-slate-700 px-4 py-3 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-99"
      >
        {isCopied ? (
          <>
            <Check size={14} className="text-green-600" />
            <span className="text-green-600">Đã sao chép liên kết</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Sao chép đường liên kết</span>
          </>
        )}
      </button>
    </div>
  );
}
