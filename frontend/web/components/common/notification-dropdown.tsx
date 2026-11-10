"use client";

import React, { useEffect, useRef, useState } from "react";
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
  markAllReadSuccess,
} from "@/store/notification/notification.slice";
import {
  markAllAsRead,
} from "@/features/notification/api/notification.api";
import { useNotificationActions } from "@/features/notification/hooks/use-notification-actions";
import { useNotificationList } from "@/features/notification/hooks/use-notification-list";
import { NotificationLoadMore } from "@/features/notification/components/notification-load-more";
import { useOpenProjectTaskNotification } from "@/features/notification/hooks/use-open-project-task-notification";
import { ProjectTaskListItemRenderer, ProjectTaskModalRenderer } from "@/features/notification/components/renderers/project-task-renderer";
import {
  NotificationType,
} from "@/features/notification/types/notification.types";
import type {
  NotificationCategory,
  NotificationDateRange,
  Notification,
  NotificationReadFilter,
  NotificationTimeFilter,
} from "@/features/notification/types/notification.types";

import { QueryFeedback } from "@/components/common/query-feedback";
import NotificationList from "@/features/notification/components/notification-list";
import NotificationDetailModal from "@/features/notification/components/notification-detail-modal";
import { ChannelMemberAddedModalRenderer, ChannelOwnershipTransferredModalRenderer } from "@/features/notification/components/renderers/channel-member-added-renderer";
import { registerNotificationRenderer } from "@/features/notification/components/notification-registry";
import { ContextNotificationListItem, ContextNotificationModal } from '@/features/notification/components/renderers/context-notification-renderer';
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
  isNotificationInCategory,
} from "@/features/notification/utils/notification-category.utils";
import {
  formatNotificationCount,
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
import type { CustomSelectOption } from "@/components/ui/custom/custom-select";
import { toast } from "sonner";
import { useMeetingConfirmDialog } from "@/features/meeting/hooks/useMeetingConfirmDialog";
import { MeetingAlertDialog } from "@/features/meeting/components/common/meeting-alert-dialog";

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
  for (const type of [NotificationType.PROJECT_TASK_ASSIGNED, NotificationType.PROJECT_TASK_UPDATED, NotificationType.PROJECT_TASK_UNASSIGNED, NotificationType.PROJECT_TASK_DELETED]) {
    registerNotificationRenderer(type, ProjectTaskModalRenderer, ProjectTaskListItemRenderer);
  }
  for (const type of [NotificationType.PROJECT_INVITATION_ACCEPTED, NotificationType.PROJECT_INVITATION_DECLINED,
    NotificationType.PROJECT_PERMISSIONS_UPDATED, NotificationType.PROJECT_MEMBER_REMOVED,
    NotificationType.DOCUMENT_SHARED, NotificationType.DOCUMENT_PERMISSION_UPDATED]) {
    registerNotificationRenderer(type, ContextNotificationModal, ContextNotificationListItem);
  }
  registerNotificationRenderer(NotificationType.CHANNEL_MEMBER_ADDED, ChannelMemberAddedModalRenderer, DefaultListItemRenderer);
  registerNotificationRenderer(NotificationType.CHANNEL_MEMBER_REMOVED, DefaultModalRenderer, DefaultListItemRenderer);
  registerNotificationRenderer(NotificationType.CHANNEL_OWNERSHIP_TRANSFERRED, ChannelOwnershipTransferredModalRenderer, DefaultListItemRenderer);
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
  const { unreadCount } = useAppSelector((state) => state.notification);
  const { accessToken, userId } = useAppSelector((state) => state.auth);

  const [markingRead, setMarkingRead] = useState(false);
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
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [isOpen, category, tab, timeFilter, customFromDate, customToDate]);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const openTaskNotification = useOpenProjectTaskNotification();
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

  const {
    list: notifications, total, unreadCountsByCategory,
    loading, listError, loadMoreError, isFetching, isLoadingMore,
    hasMore, loadMore, refresh,
  } = useNotificationList(
    { viewerId: userId, category, readFilter: tab, dateRange },
    Boolean(isOpen && accessToken && userId && !isCustomRangeInvalid),
  );
  const {
    deleteNotificationMutation,
    deleteNotificationsMutation,
    deletingNotificationId,
  } = useNotificationActions();

  const handleMarkAllAsRead = async () => {
    if (markingRead) return;
    setMarkingRead(true);
    try {
      await markAllAsRead();
      dispatch(markAllReadSuccess());
      if (isOpen) void refresh();
    } catch (error) {
      console.error("Failed to mark all as read", error);
      toast.error("Could not mark notifications as read.", { action: { label: "Retry", onClick: () => void handleMarkAllAsRead() } });
    } finally { setMarkingRead(false); }
  };

  const handleCategoryChange = (nextCategory: NotificationCategory) => {
    setCategory(nextCategory);
  };

  const handleTabChange = (nextTab: NotificationReadFilter) => {
    setTab(nextTab);
  };

  const handleTimeFilterChange = (nextFilter: NotificationTimeFilter) => {
    setTimeFilter(nextFilter);
  };

  const handleCustomFromDateChange = (value: string) => {
    setCustomFromDate(value);
  };

  const handleCustomToDateChange = (value: string) => {
    setCustomToDate(value);
  };

  const handleItemClick = (notification: Notification) => {
    if (openTaskNotification(notification, () => {
      setSelectedNotification(null);
      setIsOpen(false);
    })) return;
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
  const hasCategoryData = total > 0;
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
  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`relative z-[80] h-11 w-11 rounded-full border bg-card transition focus-visible:ring-4 focus-visible:ring-ring ${
              isOpen
                ? "border-info-outline bg-info-soft text-link"
                : "border-border text-muted-foreground hover:bg-background"
            }`}
            aria-label={unreadCount > 0 ? `Notifications, ${formatNotificationCount(unreadCount)} unread` : "Notifications"}
          >
            <Bell size={22} className={isOpen ? "fill-info-content" : ""} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-border bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                {formatNotificationCount(unreadCount)}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={10}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="flex max-h-[min(calc(100dvh-1rem),var(--radix-popover-content-available-height))] w-[min(calc(100vw-1.5rem),26rem)] flex-col overflow-hidden rounded-panel border-border bg-card p-0 ring-1 ring-foreground/5"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-background px-4 py-3">
            <h3 className="text-base font-semibold text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={markingRead}
                onClick={handleMarkAllAsRead}
                className="h-7 rounded-full px-2 text-xs font-semibold text-link hover:bg-info-soft hover:text-foreground"
              >
                <Check size={14} />
                Mark all as read
              </Button>
            ) : null}
          </div>

          <Separator />

          <div role="group" aria-label="Notification categories" className="flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
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

          <div className="shrink-0 bg-background px-3 py-2.5">
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

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4">
            <CustomTabs
              value={tab}
              options={readTabOptions}
              onChange={handleTabChange}
              ariaLabel="Notification read status"
              className="min-w-0 shrink-0"
            />
            <div className="flex min-w-0 items-center justify-end py-2">
              {tab === "READ" && hasCategoryData ? (
                <Button loading={deleteNotificationsMutation.isPending}
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
                  className="h-8 min-w-0 shrink rounded-control border-border bg-card px-2 text-xs font-semibold text-muted-foreground hover:border-border hover:bg-destructive-soft hover:text-destructive-content"
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

          <div ref={listRef} role="region" aria-label="Notification list" aria-busy={loading || isLoadingMore} tabIndex={0} className="min-h-0 max-h-[52vh] overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <QueryFeedback label="notifications" error={listError} retrying={isFetching} onRetry={refresh} />
            {(!listError || visibleNotifications.length > 0) && <NotificationList
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
            />}
            <NotificationLoadMore
              hasMore={hasMore} loading={isLoadingMore} fetching={isFetching}
              error={loadMoreError} onLoadMore={loadMore}
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
