"use client";

import React from "react";
import {
  Notification,
  InvitationResponseMetadata,
} from "../../types/notification.types";
import { XCircle, UserX, User } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";

export const InvitationDeclinedListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer transition border-b border-slate-100 last:border-0 ${!notification.isRead ? "bg-blue-50/50" : ""}`}
    >
      <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-red-50 overflow-hidden flex items-center justify-center text-red-500">
        {notification.senderAvatar ? (
          <Image
            src={notification.senderAvatar}
            alt="Avatar"
            fill
            className="object-cover opacity-80 grayscale"
          />
        ) : (
          <UserX size={20} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <XCircle size={10} /> Từ chối
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
          <span className="font-semibold text-slate-700">
            {notification.senderName || "Người được mời"}
          </span>{" "}
          đã từ chối lời mời
        </p>
        <p className="text-[10px] font-medium text-slate-400 mt-1">
          {formatTimeAgo(new Date(notification.createdAt))}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
      )}
    </div>
  );
};

export const InvitationDeclinedModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const metadata = notification.metadata as InvitationResponseMetadata;

  return (
    <div className="p-5">
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <div className="relative mb-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden shadow-sm border-2 border-white ring-4 ring-red-50 bg-red-100 flex items-center justify-center text-red-500">
            {notification.senderAvatar ? (
              <Image
                src={notification.senderAvatar}
                alt="Avatar"
                fill
                className="object-cover"
              />
            ) : (
              <User size={32} />
            )}
          </div>

          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-full border-2 border-white">
            <XCircle size={12} strokeWidth={3} />
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {notification.senderName || "Người được mời"}
        </h3>
        <p className="text-sm font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full inline-block">
          Đã từ chối lời mời
        </p>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-sm text-slate-600 text-center">
        <span className="font-semibold">
          {notification.senderName || "Người này"}
        </span>{" "}
        đã từ chối gia nhập nhóm{" "}
        <span className="font-semibold text-slate-800">
          {metadata?.conversationName || "chat"}
        </span>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
