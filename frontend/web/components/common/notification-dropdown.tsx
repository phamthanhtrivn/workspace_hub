"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  FileText,
  FolderKanban,
  MessageCircle,
  Trash2,
  Video,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  setNotifications,
  setLoading,
  markAllReadSuccess,
  setUnreadCount,
} from "@/store/notification/notification.slice";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
} from "@/features/notification/api/notification.api";
import { useNotificationActions } from "@/features/notification/hooks/use-notification-actions";
import {
  NotificationCategory,
  Notification,
  NotificationType,
} from "@/features/notification/types/notification.types";

import NotificationList from "@/features/notification/components/notification-list";
import NotificationDetailModal from "@/features/notification/components/notification-detail-modal";
import { registerNotificationRenderer } from "@/features/notification/components/notification-registry";
import {
  BACKEND_HEALTH_PATHS,
  waitForBackendReady,
} from "@/lib/backend-readiness";
import { logApiError } from "@/lib/interceptors";
import { useAppIntl } from "@/features/i18n/useAppIntl";

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
import {
  ProjectInvitationListItemRenderer,
  ProjectInvitationModalRenderer,
} from "@/features/notification/components/renderers/project-invitation-renderer";
import {
  MeetingInvitationListItemRenderer,
  MeetingInvitationModalRenderer,
} from "@/features/notification/components/renderers/meeting-invitation-renderer";
import {
  CalendarReminderListItemRenderer,
  CalendarReminderModalRenderer,
} from "@/features/notification/components/renderers/calendar-reminder-renderer";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANGED_EVENT,
  isNotificationInCategory,
} from "@/features/notification/utils/notification-category.utils";
import { toast } from "sonner";
import { useMeetingConfirmDialog } from "@/features/meeting/hooks/useMeetingConfirmDialog";
import { MeetingAlertDialog } from "@/features/meeting/components/common/meeting-alert-dialog";

const PAGE_SIZE = 10;

const categoryConfig: Record<
  NotificationCategory,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ALL: { label: "All", Icon: Bell },
  PROJECT: { label: "Project", Icon: FolderKanban },
  CHAT: { label: "Chat", Icon: MessageCircle },
  CALENDAR: { label: "Calendar", Icon: CalendarDays },
  MEETING: { label: "Meeting", Icon: Video },
  DOCUMENT: { label: "Document", Icon: FileText },
};

// Initialize Registry
let isRegistryInitialized = false;
if (!isRegistryInitialized) {
  registerNotificationRenderer(
    "DEFAULT",
    DefaultModalRenderer,
    DefaultListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.SPACE_INVITATION,
    InvitationModalRenderer,
    InvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.SPACE_INVITATION_ACCEPTED,
    InvitationAcceptedModalRenderer,
    InvitationAcceptedListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.SPACE_INVITATION_DECLINED,
    InvitationDeclinedModalRenderer,
    InvitationDeclinedListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.PROJECT_INVITATION,
    ProjectInvitationModalRenderer,
    ProjectInvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.MEETING_INVITATION,
    MeetingInvitationModalRenderer,
    MeetingInvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.MEETING_INVITATION_DECLINED,
    MeetingInvitationModalRenderer,
    MeetingInvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.MEETING_UPDATED,
    MeetingInvitationModalRenderer,
    MeetingInvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.MEETING_CANCELLED,
    MeetingInvitationModalRenderer,
    MeetingInvitationListItemRenderer,
  );
  registerNotificationRenderer(
    NotificationType.CALENDAR_REMINDER,
    CalendarReminderModalRenderer,
    CalendarReminderListItemRenderer,
  );
  isRegistryInitialized = true;
}

const NotificationDropdown = React.memo(function NotificationDropdown() {
  const intl = useAppIntl();
  const dispatch = useAppDispatch();
  const {
    list: notifications,
    unreadCount,
    loading,
  } = useAppSelector((state) => state.notification);
  const { accessToken } = useAppSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const [category, setCategory] = useState<NotificationCategory>("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    categoryUnreadCount: 0,
  });
  const [globalNotificationTotal, setGlobalNotificationTotal] = useState(0);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let retryTimer: number | undefined;

    if (accessToken) {
      const fetchUnreadWhenReady = async () => {
        const isReady = await waitForBackendReady(
          BACKEND_HEALTH_PATHS.notification,
          { attempts: 1 },
        );

        if (isCancelled) return;

        if (!isReady) {
          retryTimer = window.setTimeout(fetchUnreadWhenReady, 3_000);
          return;
        }

        try {
          const res = await getUnreadCount();
          if (isCancelled) return;

          dispatch(setUnreadCount(res.data.unreadCount));
        } catch (error) {
          logApiError(error, "Failed to fetch notification unread count");
        }
      };

      void fetchUnreadWhenReady();
    }

    return () => {
      isCancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [accessToken, dispatch]);

  const fetchList = React.useCallback(
    async (nextPage = page) => {
      if (!accessToken) return;
      try {
        dispatch(setLoading(true));
        const res = await getNotifications(
          nextPage,
          PAGE_SIZE,
          tab === "UNREAD" ? false : undefined,
          category,
        );
        if (category === "ALL") {
          setGlobalNotificationTotal(res.pagination.total);
        } else {
          const globalRes = await getNotifications(1, 1, undefined, "ALL");
          setGlobalNotificationTotal(globalRes.pagination.total);
        }
        dispatch(
          setNotifications({
            list: res.data,
            total: res.pagination.total,
            unreadCount: res.pagination.unreadCount,
          }),
        );
        setPagination({
          page: res.pagination.page,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
          categoryUnreadCount:
            res.pagination.categoryUnreadCount ?? res.pagination.unreadCount,
        });
      } catch (error) {
        logApiError(error, "Failed to fetch notifications");
      } finally {
        dispatch(setLoading(false));
      }
    },
    [accessToken, category, dispatch, page, tab],
  );
  const {
    deleteNotificationMutation,
    deleteNotificationsMutation,
    deletingNotificationId,
  } = useNotificationActions();

  useEffect(() => {
    if (isOpen) void fetchList(page);
  }, [fetchList, isOpen, page]);

  useEffect(() => {
    if (!isOpen) return;

    const handleNotificationChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: NotificationCategory }>)
        .detail;
      if (
        !detail?.category ||
        detail.category === "ALL" ||
        category === "ALL" ||
        detail.category === category
      ) {
        void fetchList(page);
      }
    };

    window.addEventListener(
      NOTIFICATION_CHANGED_EVENT,
      handleNotificationChanged,
    );
    return () => {
      window.removeEventListener(
        NOTIFICATION_CHANGED_EVENT,
        handleNotificationChanged,
      );
    };
  }, [category, fetchList, isOpen, page]);

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
      setPage(1);
      if (isOpen) void fetchList(1);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleCategoryChange = (nextCategory: NotificationCategory) => {
    setCategory(nextCategory);
    setPage(1);
  };

  const handleTabChange = (nextTab: "ALL" | "UNREAD") => {
    setTab(nextTab);
    setPage(1);
  };

  const handleItemClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsOpen(false); // Close dropdown when opening modal
  };

  const confirmDelete = async ({
    title,
    text,
    confirmButtonText,
  }: {
    title: string;
    text: string;
    confirmButtonText: string;
  }) => {
    return confirm({
      title,
      description: text,
      confirmLabel: confirmButtonText,
      cancelLabel: intl.formatMessage({ id: "app.cancel" }),
      variant: "danger",
    });
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const confirmed = await confirmDelete({
      title: intl.formatMessage({ id: "notifications.deleteOneConfirmTitle" }),
      text: intl.formatMessage({ id: "notifications.deleteOneConfirmText" }),
      confirmButtonText: intl.formatMessage({ id: "notifications.deleteOne" }),
    });
    if (!confirmed) return;

    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
      const nextPage =
        page > 1 && visibleNotifications.length <= 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else if (isOpen) {
        void fetchList(nextPage);
      }
      toast.success(
        intl.formatMessage({ id: "notifications.deleteSuccess" }),
      );
    } catch (error) {
      logApiError(error, "Failed to delete notification");
      toast.error(intl.formatMessage({ id: "notifications.deleteFailed" }));
    }
  };

  const handleDeleteCategory = async (targetCategory: NotificationCategory) => {
    const categoryLabel = categoryConfig[targetCategory].label;
    const isAll = targetCategory === "ALL";
    const confirmed = await confirmDelete({
      title: intl.formatMessage({
        id: isAll
          ? "notifications.deleteAllConfirmTitle"
          : "notifications.deleteCategoryConfirmTitle",
      }),
      text: intl.formatMessage(
        {
          id: isAll
            ? "notifications.deleteAllConfirm"
            : "notifications.deleteCategoryConfirm",
        },
        { category: categoryLabel },
      ),
      confirmButtonText: intl.formatMessage(
        {
          id: isAll ? "notifications.deleteAll" : "notifications.deleteCategory",
        },
        { category: categoryLabel },
      ),
    });
    if (!confirmed) return;

    try {
      await deleteNotificationsMutation.mutateAsync(targetCategory);
      setPage(1);
      if (isOpen) void fetchList(1);
      toast.success(
        intl.formatMessage({
          id: isAll
            ? "notifications.deleteAllSuccess"
            : "notifications.deleteCategorySuccess",
        }),
      );
    } catch (error) {
      logApiError(error, "Failed to delete notifications");
      toast.error(intl.formatMessage({ id: "notifications.deleteFailed" }));
    }
  };

  const visibleNotifications = notifications.filter((notification) =>
    isNotificationInCategory(notification, category),
  );
  const unreadTabCount =
    category === "ALL" ? unreadCount : pagination.categoryUnreadCount;
  const hasCategoryData = pagination.total > 0;
  const hasGlobalData = globalNotificationTotal > 0;
  const currentPage = Math.min(page, pagination.totalPages);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pagination.totalPages;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex z-100 h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer ${
          isOpen
            ? "border-indigo-300 text-indigo-600 bg-indigo-50"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
        aria-label={intl.formatMessage({ id: "header.notifications" })}
      >
        <Bell size={22} className={isOpen ? "fill-indigo-100" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white border-2 border-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-[-48] z-90 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-100 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
            <h3 className="font-black text-slate-800 text-base">
              {intl.formatMessage({ id: "notifications.title" })}
            </h3>
            <div className="flex items-center justify-end gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800"
                >
                  <Check size={14} />
                  {intl.formatMessage({ id: "notifications.markAllRead" })}
                </button>
              )}
              {hasGlobalData && (
                <button
                  type="button"
                  onClick={() => void handleDeleteCategory("ALL")}
                  disabled={deleteNotificationsMutation.isPending}
                  className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {intl.formatMessage({ id: "notifications.deleteAll" })}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
            {NOTIFICATION_CATEGORIES.map((item) => {
              const { label, Icon } = categoryConfig[item];
              const isActive = category === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleCategoryChange(item)}
                  className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4">
            <div className="flex shrink-0">
              <button
                onClick={() => handleTabChange("ALL")}
                className={`py-2.5 px-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                  tab === "ALL"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {intl.formatMessage({ id: "notifications.all" })}
              </button>
              <button
                onClick={() => handleTabChange("UNREAD")}
                className={`py-2.5 px-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  tab === "UNREAD"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {intl.formatMessage({ id: "notifications.unread" })}
                {unreadTabCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === "UNREAD" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {unreadTabCount > 99 ? "99+" : unreadTabCount}
                  </span>
                )}
              </button>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto py-2">
              {category !== "ALL" && hasCategoryData && (
                <button
                  type="button"
                  onClick={() => void handleDeleteCategory(category)}
                  disabled={deleteNotificationsMutation.isPending}
                  className="inline-flex h-7 max-w-32 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-slate-50 px-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {intl.formatMessage(
                      { id: "notifications.deleteCategory" },
                      { category: categoryConfig[category].label },
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[52vh] overflow-y-auto overscroll-contain">
            <NotificationList
              notifications={visibleNotifications}
              onItemClick={handleItemClick}
              onDelete={(notificationId) =>
                void handleDeleteNotification(notificationId)
              }
              deletingNotificationId={deletingNotificationId}
              isLoading={loading}
            />
          </div>
          <div className="flex items-center justify-end gap-1 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={!canGoPrevious || loading}
              className="h-7 rounded-md px-2 text-xs font-black text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              &lt;&lt;
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={!canGoPrevious || loading}
              className="h-7 rounded-md px-2 text-xs font-black text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              &lt;
            </button>
            <span className="mx-1 min-w-12 rounded-full bg-white px-2 py-1 text-center text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
              {currentPage}/{pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(pagination.totalPages, value + 1))
              }
              disabled={!canGoNext || loading}
              className="h-7 rounded-md px-2 text-xs font-black text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              &gt;
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.totalPages)}
              disabled={!canGoNext || loading}
              className="h-7 rounded-md px-2 text-xs font-black text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              &gt;&gt;
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
      <MeetingAlertDialog {...alertDialogProps} />
    </div>
  );
});

export default NotificationDropdown;
