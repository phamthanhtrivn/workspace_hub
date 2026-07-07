"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  setNotifications,
  setLoading,
  addNotification,
  markAllReadSuccess,
} from "@/store/notification/notification.slice";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
} from "@/features/notification/api/notification.api";
import { notificationSocketService } from "@/features/notification/api/notification-socket.service";
import {
  Notification,
  NotificationType,
} from "@/features/notification/types/notification.types";

import NotificationList from "@/features/notification/components/notification-list";
import NotificationDetailModal from "@/features/notification/components/notification-detail-modal";
import { registerNotificationRenderer } from "@/features/notification/components/notification-registry";

// Renderers
import {
  DefaultListItemRenderer,
  DefaultModalRenderer,
} from "@/features/notification/components/renderers/default-renderer";
import {
  InvitationListItemRenderer,
  InvitationModalRenderer,
} from "@/features/notification/components/renderers/invitation-renderer";
import {
  InvitationAcceptedListItemRenderer,
  InvitationAcceptedModalRenderer,
} from "@/features/notification/components/renderers/invitation-accepted-renderer";
import {
  InvitationDeclinedListItemRenderer,
  InvitationDeclinedModalRenderer,
} from "@/features/notification/components/renderers/invitation-declined-renderer";

// Initialize Registry
let isRegistryInitialized = false;
if (!isRegistryInitialized) {
  registerNotificationRenderer(
    "DEFAULT",
    DefaultModalRenderer,
    DefaultListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.CHAT_GROUP_INVITATION,
    InvitationModalRenderer,
    InvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.CHAT_INVITATION_ACCEPTED,
    InvitationAcceptedModalRenderer,
    InvitationAcceptedListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.CHAT_INVITATION_DECLINED,
    InvitationDeclinedModalRenderer,
    InvitationDeclinedListItemRenderer,
  );
  isRegistryInitialized = true;
}

export default function NotificationDropdown() {
  const dispatch = useAppDispatch();
  const {
    list: notifications,
    unreadCount,
    loading,
  } = useAppSelector((state) => state.notification);
  const { accessToken } = useAppSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (accessToken) {
      getUnreadCount()
        .then((res) =>
          dispatch(
            setNotifications({
              list: notifications,
              total: notifications.length,
              unreadCount: res.data.unreadCount,
            }),
          ),
        )
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (isOpen) {
      const fetchList = async () => {
        try {
          dispatch(setLoading(true));
          const res = await getNotifications(
            1,
            20,
            tab === "UNREAD" ? false : undefined,
          );
          dispatch(
            setNotifications({
              list: res.data,
              total: res.pagination.total,
              unreadCount: res.pagination.unreadCount,
            }),
          );
        } catch (error) {
          console.error("Failed to fetch notifications", error);
        } finally {
          dispatch(setLoading(false));
        }
      };
      fetchList();
    }
  }, [isOpen, tab, dispatch]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      dispatch(markAllReadSuccess());
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleItemClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsOpen(false); // Close dropdown when opening modal
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex z-100 h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer ${
          isOpen
            ? "border-indigo-300 text-indigo-600 bg-indigo-50"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
        aria-label="Notifications"
      >
        <Bell size={22} className={isOpen ? "fill-indigo-100" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white border-2 border-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-[-48] mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-100 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2 z-[90]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
            <h3 className="font-black text-slate-800 text-base">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
              >
                <Check size={14} /> Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="flex px-4 border-b border-slate-100">
            <button
              onClick={() => setTab("ALL")}
              className={`py-2.5 px-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                tab === "ALL"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTab("UNREAD")}
              className={`py-2.5 px-4 text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                tab === "UNREAD"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Chưa đọc
              {unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === "UNREAD" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            <NotificationList
              notifications={notifications}
              onItemClick={handleItemClick}
              isLoading={loading}
            />
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <button className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer">
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </div>
  );
}
