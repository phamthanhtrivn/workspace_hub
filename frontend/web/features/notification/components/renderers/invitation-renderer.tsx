"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Notification,
  InvitationMetadata,
} from "../../types/notification.types";
import { User, Users } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";
import {
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
} from "@/features/chat/api/chat.api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

export const InvitationListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  const metadata = notification.metadata as InvitationMetadata;
  const avatarUrl =
    metadata?.conversationAvatarUrl || notification.senderAvatar;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition border-b border-slate-100 last:border-0 ${!notification.isRead ? "bg-blue-50/50" : ""}`}
    >
      <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-600">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Group Avatar"
            fill
            className="object-cover"
          />
        ) : (
          <User size={20} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Lời mời nhóm
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
          {notification.content}
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

export const InvitationModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, onClose, onMarkAsRead }) => {
  const metadata = notification.metadata as InvitationMetadata;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResponded, setIsResponded] = useState(false); // To handle already accepted/declined locally

  useEffect(() => {
    if (metadata?.invitationId) {
      getPendingInvitations()
        .then((res) => {
          if (res && res.data) {
            const isPending = res.data.some(
              (inv: any) => inv.id === metadata.invitationId
            );
            if (!isPending) {
              setIsResponded(true);
            }
          }
        })
        .catch(console.error);
    }
  }, [metadata?.invitationId]);

  const handleResponse = async (action: "accept" | "decline") => {
    if (!metadata?.invitationId) {
      toast.error("Không tìm thấy thông tin lời mời");
      return;
    }

    const actionText = action === "accept" ? "chấp nhận" : "từ chối";
    const confirmColor = action === "accept" ? "#4f46e5" : "#ef4444";

    const result = await Swal.fire({
      title: `Bạn có chắc chắn?`,
      text: `Bạn sẽ ${actionText} lời mời gia nhập nhóm này.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy bỏ",
    });

    if (result.isConfirmed) {
      try {
        setIsProcessing(true);

        if (action === "accept") {
          await acceptInvitation(metadata.invitationId);
        } else {
          await declineInvitation(metadata.invitationId);
        }

        toast.success(`Đã ${actionText} lời mời thành công`);
        setIsResponded(true);
        onMarkAsRead(notification.id);

        if (action === "accept") {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          router.push(`/chat?id=${metadata.conversationId}`);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || `Thao tác thất bại`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="p-5">
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <div className="relative h-20 w-20 rounded-full shadow-sm border border-slate-100 bg-gradient-to-br from-gray-100 to-gray-200  overflow-hidden flex items-center justify-center text-gray-400 mb-4">
          {metadata?.conversationAvatarUrl ? (
            <Image
              src={metadata?.conversationAvatarUrl}
              alt="Group Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <Users size={40} strokeWidth={1.5} />
          )}
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-1">
          {metadata?.conversationName || "Người dùng"}
        </h3>
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">
            {notification.senderName || "Người ẩn danh"}
          </span>{" "}
          đã mời bạn tham gia nhóm
        </p>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-sm text-slate-600 text-center">
        "{notification.content}"
      </div>

      {isResponded ? (
        <div className="text-center p-3 text-sm font-semibold text-emerald-600 bg-emerald-50 rounded-xl mb-4">
          Đã phản hồi lời mời này
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handleResponse("decline")}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-xl text-sm font-bold transition disabled:opacity-50 cursor-pointer"
          >
            Từ chối
          </button>
          <button
            onClick={() => handleResponse("accept")}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 rounded-xl text-sm font-bold transition disabled:opacity-50 cursor-pointer"
          >
            Chấp nhận
          </button>
        </div>
      )}

      <div className="flex justify-center border-t border-slate-100 pt-4 mt-2">
        <button
          onClick={onClose}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          Đóng cửa sổ
        </button>
      </div>
    </div>
  );
};
