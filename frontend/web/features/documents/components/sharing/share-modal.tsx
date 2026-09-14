"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentItem } from "../../types/documents.types";
import { LinkAccess } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { ShareModalForm } from "./share-form";
import { ShareModalList } from "./share-list";
import { ShareModalLink } from "./share-link";
import { Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/store/store";

interface ShareModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  item: DocumentItem | null;
}

export function ShareModal({ open, isOpen, onClose, item }: ShareModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const isOwner = item ? item.ownerUserId === currentUserId : false;

  const { data: sharingData, isLoading } = useQuery({
    queryKey: ["document-sharing", item?.id],
    queryFn: () => {
      if (!item) return Promise.resolve({ shares: [], linkAccess: LinkAccess.NONE });
      return documentsApi.getSharing(item.id);
    },
    enabled: isModalOpen && !!item,
  });

  const shares = sharingData?.shares || [];
  const linkAccess = (sharingData?.linkAccess as LinkAccess) || LinkAccess.NONE;

  if (!isModalOpen || !item) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-3xl">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-black text-slate-800">
              Share Resource
            </DialogTitle>
            <p className="mt-0.5 truncate text-xs text-slate-400 font-bold">
              {item.name}
            </p>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Add email access */}
          {isOwner ? <ShareModalForm documentItemId={item.id} /> : null}

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
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(ShareModal);
