"use client";

import React, { useEffect, useState } from "react";
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
  NotificationType,
} from "@/features/notification/types/notification.types";
import type {
  NotificationCategory,
  NotificationDateRange,
  Notification,
  NotificationReadFilter,
  NotificationTimeFilter,
  NotificationUnreadCountsByCategory,
} from "@/features/notification/types/notification.types";

import NotificationList from "@/features/notification/components/notification-list";
import NotificationDetailModal from "@/features/notification/components/notification-detail-modal";
import { registerNotificationRenderer } from "@/features/notification/components/notification-registry";
import {
  BACKEND_HEALTH_PATHS,
  waitForBackendReady,
} from "@/lib/backend-readiness";
import { logApiError } from "@/lib/interceptors";

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
import {
  formatNotificationCount,
  getReadFilterValue,
} from "@/features/notification/utils/notification-display.utils";
import {
  getNotificationDateRange,
  NOTIFICATION_TIME_FILTERS,
  toLocalDateInputValue,
} from "@/features/notification/utils/notification-time-filter.utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CustomDateRange } from "@/components/ui/custom/custom-date-range";
import { CustomTag } from "@/components/ui/custom/custom-tag";
import {
  CustomTabs,
  type CustomTabOption,
} from "@/components/ui/custom/custom-tabs";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import type { CustomSelectOption } from "@/components/ui/custom/custom-select";
import { toast } from "sonner";
import { useMeetingConfirmDialog } from "@/features/meeting/hooks/useMeetingConfirmDialog";
import { MeetingAlertDialog } from "@/features/meeting/components/common/meeting-alert-dialog";

const PAGE_SIZE = 10;

const EMPTY_UNREAD_COUNTS_BY_CATEGORY: NotificationUnreadCountsByCategory = {
  ALL: 0,
  PROJECT: 0,
  CHAT: 0,
  CALENDAR: 0,
  MEETING: 0,
  DOCUMENT: 0,
};

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
  const dispatch = useAppDispatch();
  const {
    list: notifications,
    unreadCount,
    loading,
  } = useAppSelector((state) => state.notification);
  const { accessToken } = useAppSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<NotificationReadFilter>("ALL");
  const [category, setCategory] = useState<NotificationCategory>("ALL");
  const [timeFilter, setTimeFilter] =
    useState<NotificationTimeFilter>("ALL_TIME");
  const [customFromDate, setCustomFromDate] = useState(() =>
    toLocalDateInputValue(new Date()),
  );
  const [customToDate, setCustomToDate] = useState(() =>
    toLocalDateInputValue(new Date()),
  );
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    categoryUnreadCount: 0,
  });
  const [unreadCountsByCategory, setUnreadCountsByCategory] =
    useState<NotificationUnreadCountsByCategory>(
      EMPTY_UNREAD_COUNTS_BY_CATEGORY,
    );
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();

  const dateRange: NotificationDateRange = React.useMemo(
    () =>
      getNotificationDateRange(timeFilter, {
        customFromDate,
        customToDate,
      }),
    [customFromDate, customToDate, timeFilter],
  );
  const isCustomRangeInvalid =
    timeFilter === "CUSTOM_RANGE" &&
    Boolean(customFromDate) &&
    Boolean(customToDate) &&
    customFromDate > customToDate;

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
      if (isCustomRangeInvalid) {
        dispatch(setLoading(false));
        dispatch(
          setNotifications({
            list: [],
            total: 0,
            unreadCount,
          }),
        );
        setPagination({
          page: 1,
          total: 0,
          totalPages: 1,
          categoryUnreadCount: 0,
        });
        setUnreadCountsByCategory(EMPTY_UNREAD_COUNTS_BY_CATEGORY);
        return;
      }
      try {
        dispatch(setLoading(true));
        const hasDateFilter = Boolean(dateRange.fromDate || dateRange.toDate);
        const [res, globalUnreadRes] = await Promise.all([
          getNotifications(
            nextPage,
            PAGE_SIZE,
            getReadFilterValue(tab),
            category,
            dateRange,
          ),
          hasDateFilter ? getUnreadCount() : Promise.resolve(null),
        ]);
        const fallbackUnreadCounts: NotificationUnreadCountsByCategory = {
          ...EMPTY_UNREAD_COUNTS_BY_CATEGORY,
          ALL: res.pagination.unreadCount,
          [category]:
            res.pagination.categoryUnreadCount ?? res.pagination.unreadCount,
        };
        const nextUnreadCounts =
          res.pagination.unreadCountsByCategory ?? fallbackUnreadCounts;
        const nextGlobalUnreadCount =
          globalUnreadRes?.data.unreadCount ?? res.pagination.unreadCount;
        dispatch(
          setNotifications({
            list: res.data,
            total: res.pagination.total,
            unreadCount: nextGlobalUnreadCount,
          }),
        );
        setUnreadCountsByCategory(nextUnreadCounts);
        setPagination({
          page: res.pagination.page,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
          categoryUnreadCount:
            res.pagination.categoryUnreadCount ??
            nextUnreadCounts[category] ??
            res.pagination.unreadCount,
        });
      } catch (error) {
        logApiError(error, "Failed to fetch notifications");
      } finally {
        dispatch(setLoading(false));
      }
    },
    [
      accessToken,
      category,
      dateRange,
      dispatch,
      isCustomRangeInvalid,
      page,
      tab,
      unreadCount,
    ],
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

    const handleNotificationChanged = () => {
      void fetchList(page);
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
  }, [fetchList, isOpen, page]);

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

  const handleTabChange = (nextTab: NotificationReadFilter) => {
    setTab(nextTab);
    setPage(1);
  };

  const handleTimeFilterChange = (nextFilter: NotificationTimeFilter) => {
    setTimeFilter(nextFilter);
    setPage(1);
  };

  const handleCustomFromDateChange = (value: string) => {
    setCustomFromDate(value);
    setPage(1);
  };

  const handleCustomToDateChange = (value: string) => {
    setCustomToDate(value);
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
      cancelLabel: "Cancel",
      variant: "danger",
    });
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const confirmed = await confirmDelete({
      title: "Delete this notification?",
      text: "This notification will be removed from your list.",
      confirmButtonText: "Delete notification",
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
      toast.success("Notification deleted");
    } catch (error) {
      logApiError(error, "Failed to delete notification");
      toast.error("Could not delete notifications");
    }
  };

  const handleDeleteCategory = async (targetCategory: NotificationCategory) => {
    const categoryLabel = categoryConfig[targetCategory].label;
    const isAll = targetCategory === "ALL";
    const confirmed = await confirmDelete({
      title: isAll
        ? "Delete read notifications?"
        : "Delete read category notifications?",
      text: isAll
        ? "Delete read notifications in this time range? This cannot be undone."
        : `Delete read notifications in ${categoryLabel} for this time range? This cannot be undone.`,
      confirmButtonText: isAll
        ? "Delete read"
        : `Delete read ${categoryLabel}`,
    });
    if (!confirmed) return;

    try {
      await deleteNotificationsMutation.mutateAsync({
        category: targetCategory,
        isRead: true,
        dateRange,
      });
      setPage(1);
      if (isOpen) void fetchList(1);
      toast.success(
        isAll ? "All notifications deleted" : "Category notifications deleted",
      );
    } catch (error) {
      logApiError(error, "Failed to delete notifications");
      toast.error("Could not delete notifications");
    }
  };

  const visibleNotifications = notifications.filter((notification) =>
    isNotificationInCategory(notification, category),
  );
  const unreadTabCount = unreadCountsByCategory[category] ?? 0;
  const hasCategoryData = pagination.total > 0;
  const currentPage = Math.min(page, pagination.totalPages);
  const timeFilterOptions = React.useMemo<
    CustomSelectOption<NotificationTimeFilter>[]
  >(
    () =>
      NOTIFICATION_TIME_FILTERS.map((item) => ({
        value: item,
        label:
          item === "ALL_TIME"
            ? "All time"
            : item === "TODAY"
              ? "Today"
              : item === "LAST_7_DAYS"
                ? "Last 7 days"
                : item === "LAST_30_DAYS"
                  ? "Last 30 days"
                  : item === "THIS_MONTH"
                    ? "This month"
                    : "Custom range",
        icon: <CalendarDays className="h-3.5 w-3.5" />,
      })),
    [],
  );
  const readTabOptions = React.useMemo<
    CustomTabOption<NotificationReadFilter>[]
  >(
    () => [
      {
        value: "ALL",
        label: "All",
      },
      {
        value: "UNREAD",
        label: "Unread",
        count: unreadTabCount,
      },
      {
        value: "READ",
        label: "Read",
      },
    ],
    [unreadTabCount],
  );
  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), pagination.totalPages));
  };

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`relative z-[80] h-11 w-11 rounded-full border bg-white shadow-sm transition focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 ${
              isOpen
                ? "border-blue-300 bg-blue-50 text-[var(--color-primary)]"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            aria-label="Notifications"
          >
            <Bell size={22} className={isOpen ? "fill-blue-100" : ""} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                {formatNotificationCount(unreadCount)}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={10}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="w-[min(calc(100vw-1.5rem),26rem)] overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-[0_20px_55px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
        >
          <div className="flex items-center justify-between gap-3 bg-slate-50/80 px-4 py-3">
            <h3 className="text-base font-black text-slate-800">
              Notifications
            </h3>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-7 rounded-full px-2 text-xs font-black text-[var(--color-primary)] hover:bg-blue-50 hover:text-[var(--color-primary-dark)]"
              >
                <Check size={14} />
                Mark all as read
              </Button>
            ) : null}
          </div>

          <Separator />

          <div className="flex gap-2 overflow-x-auto px-3 py-2">
            {NOTIFICATION_CATEGORIES.map((item) => {
              const { label, Icon } = categoryConfig[item];
              const itemUnreadCount = unreadCountsByCategory[item] ?? 0;

              return (
                <CustomTag
                  key={item}
                  label={label}
                  icon={<Icon className="h-3.5 w-3.5" />}
                  count={itemUnreadCount}
                  selected={category === item}
                  onClick={() => handleCategoryChange(item)}
                />
              );
            })}
          </div>

          <Separator />

          <div className="bg-slate-50/60 px-3 py-2.5">
            <CustomDateRange
              value={timeFilter}
              options={timeFilterOptions}
              fromDate={customFromDate}
              toDate={customToDate}
              invalid={isCustomRangeInvalid}
              customRangeValue="CUSTOM_RANGE"
              onFilterChange={handleTimeFilterChange}
              onFromDateChange={handleCustomFromDateChange}
              onToDateChange={handleCustomToDateChange}
              ariaLabel="Notification time range"
              fromLabel="From date"
              toLabel="To date"
              toText="to"
              invalidMessage="Start date must be before end date."
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-2 px-4">
            <CustomTabs
              value={tab}
              options={readTabOptions}
              onChange={handleTabChange}
              ariaLabel="Notification time range"
              className="min-w-0 shrink-0"
            />
            <div className="flex min-w-0 items-center justify-end py-2">
              {tab === "READ" && hasCategoryData ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDeleteCategory(category)}
                  disabled={deleteNotificationsMutation.isPending}
                  aria-label={
                    category === "ALL"
                      ? "Delete read"
                      : `Delete read ${categoryConfig[category].label}`
                  }
                  title={
                    category === "ALL"
                      ? "Delete read"
                      : `Delete read ${categoryConfig[category].label}`
                  }
                  className="h-8 min-w-0 shrink rounded-lg border-slate-200 bg-white px-2 text-xs font-black text-slate-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {category === "ALL"
                      ? "Delete read"
                      : `Delete read ${categoryConfig[category].label}`}
                  </span>
                </Button>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="max-h-[52vh] overflow-y-auto overscroll-contain">
            <NotificationList
              notifications={visibleNotifications}
              onItemClick={handleItemClick}
              onDelete={
                tab === "READ"
                  ? (notificationId) =>
                      void handleDeleteNotification(notificationId)
                  : undefined
              }
              deletingNotificationId={deletingNotificationId}
              isLoading={loading}
            />
          </div>

          <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2">
            <SimplePagination
              page={currentPage}
              totalPages={pagination.totalPages}
              isLoading={loading}
              onPageChange={handlePageChange}
            />
          </div>
        </PopoverContent>
      </Popover>

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
