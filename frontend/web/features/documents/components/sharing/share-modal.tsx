"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { DocumentItem, DocumentShare } from "../../types/documents.types";
import { LinkAccess } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { ShareModalForm } from "./share-form";
import { ShareModalList } from "./share-list";
import { ShareModalLink } from "./share-link";
import { X, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DocumentItem | null;
}

function ShareModal({ isOpen, onClose, item }: ShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [linkAccess, setLinkAccess] = useState<LinkAccess>(LinkAccess.NONE);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const isOwner = item ? item.ownerUserId === currentUserId : false;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const fetchSharingData = useCallback(async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const data = await documentsApi.getSharing(item.id);
      setShares(data.shares);
      setLinkAccess(data.linkAccess as LinkAccess);
    } catch (err) {
      console.error("Failed to fetch sharing settings", err);
      toast.error("Không thể tải thông tin chia sẻ");
    } finally {
      setIsLoading(false);
    }
  }, [item]);

  useEffect(() => {
    if (isOpen && item) {
      void fetchSharingData();
    }
  }, [isOpen, item, fetchSharingData]);

  if (!isOpen || !item || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-50 p-6 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 leading-tight">
                Chia sẻ tài nguyên
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5 truncate max-w-[280px]">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors border border-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex-1 bg-white space-y-6">
          {/* Add email access */}
          {isOwner && (
            <ShareModalForm
              documentItemId={item.id}
              onShareAdded={fetchSharingData}
            />
          )}

          {/* User shares list */}
          <ShareModalList
            documentItemId={item.id}
            ownerEmail={item.ownerEmail}
            shares={shares}
            isLoading={isLoading}
            onShareUpdated={fetchSharingData}
            isOwner={isOwner}
          />

          {/* General Link Access */}
          <ShareModalLink
            documentItemId={item.id}
            initialLinkAccess={linkAccess}
            onLinkAccessChanged={setLinkAccess}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default React.memo(ShareModal);
