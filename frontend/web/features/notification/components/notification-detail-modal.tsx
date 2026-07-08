"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Notification } from "../types/notification.types";
import { getNotificationRenderer } from "./notification-registry";
import { DefaultModalRenderer } from "./renderers/default-renderer";
import { X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { markReadSuccess } from "@/store/notification/notification.slice";
import { markAsRead } from "../api/notification.api";

interface NotificationDetailModalProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationDetailModal = React.memo(function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto mark as read when opened
  useEffect(() => {
    if (!notification.isRead) {
      markAsRead(notification.id)
        .then(() => dispatch(markReadSuccess(notification.id)))
        .catch(console.error);
    }
  }, [notification, dispatch]);

  const handleMarkAsRead = useCallback((id: string) => {
    if (!notification.isRead) {
      markAsRead(id)
        .then(() => dispatch(markReadSuccess(id)))
        .catch(console.error);
    }
  }, [notification.isRead, dispatch]);

  const renderer = getNotificationRenderer(notification.type);
  const ModalContent = renderer ? renderer.modalRenderer : DefaultModalRenderer;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Chi tiết thông báo</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">
          <ModalContent
            notification={notification}
            onClose={onClose}
            onMarkAsRead={handleMarkAsRead}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
});

export default NotificationDetailModal;
