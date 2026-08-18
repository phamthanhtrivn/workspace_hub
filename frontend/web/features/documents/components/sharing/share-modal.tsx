"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { DocumentItem } from "../../types/documents.types";
import { LinkAccess } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { ShareModalForm } from "./share-form";
import { ShareModalList } from "./share-list";
import { ShareModalLink } from "./share-link";
import { X, Share2 } from "lucide-react";
import { useAppSelector } from "@/store/store";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DocumentItem | null;
}

function ShareModal({ isOpen, onClose, item }: ShareModalProps) {
  const [mounted, setMounted] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const isOwner = item ? item.ownerUserId === currentUserId : false;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const { data: sharingData, isLoading } = useQuery({
    queryKey: ["document-sharing", item?.id],
    queryFn: () => {
      if (!item) return Promise.resolve({ shares: [], linkAccess: LinkAccess.NONE });
      return documentsApi.getSharing(item.id);
    },
    enabled: isOpen && !!item && mounted,
  });

  const shares = sharingData?.shares || [];
  const linkAccess = (sharingData?.linkAccess as LinkAccess) || LinkAccess.NONE;

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
                Share Resource
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
            />
          )}

          {/* User shares list */}
          <ShareModalList
            documentItemId={item.id}
            ownerEmail={item.ownerEmail}
            shares={shares}
            isLoading={isLoading}
            isOwner={isOwner}
          />

          {/* General Link Access */}
          <ShareModalLink
            documentItemId={item.id}
            initialLinkAccess={linkAccess}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default React.memo(ShareModal);
