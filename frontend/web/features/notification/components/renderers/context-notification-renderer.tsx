"use client";

import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { NotificationListRow } from "../notification-list-row";
import { NotificationCategoryIcon } from "../notification-category-icon";
import { getProjectColor } from "../../utils/project-invitation.utils";
import type {
  NotificationListItemProps,
  NotificationRendererProps,
} from "../notification-registry";
import { NotificationType } from "../../types/notification.types";
import {
  getContextNotificationDetails,
  getContextNotificationLink,
} from "../../utils/context-notification.utils";

export function ContextNotificationListItem({
  notification,
  onClick,
}: NotificationListItemProps) {
  const contextName =
    notification.metadata?.projectName ?? notification.metadata?.documentName;

  return (
    <NotificationListRow
      notification={notification}
      onClick={onClick}
      title={notification.title}
      description={`${notification.senderName || "A workspace member"} · ${typeof contextName === "string" ? contextName : notification.content}`}
    >
      <span className="mt-1 block text-xs font-normal text-muted-foreground">
        {notification.content}
      </span>
    </NotificationListRow>
  );
}

export function ContextNotificationModal({
  notification,
  onClose,
}: NotificationRendererProps) {
  const router = useRouter();
  const link = getContextNotificationLink(notification);
  const details = getContextNotificationDetails(notification);
  const isDocument = notification.type.startsWith("DOCUMENT_");
  const projectIcon = notification.metadata?.projectIcon;

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-panel border border-border bg-background p-4">
        <div className="flex items-start gap-3">
          {typeof projectIcon === "string" && projectIcon.trim() ? (
            <span
              className="grid size-11 shrink-0 place-items-center rounded-panel border border-border bg-muted text-2xl"
              style={{
                color: getProjectColor(
                  typeof notification.metadata?.projectColor === "string"
                    ? notification.metadata.projectColor
                    : undefined,
                ),
              }}
            >
              {projectIcon}
            </span>
          ) : (
            <NotificationCategoryIcon notification={notification} />
          )}
          <div className="min-w-0">
            <h3 className="text-section-title font-semibold text-foreground">
              {notification.title}
            </h3>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {notification.content}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
            <UserAvatar
              src={notification.senderAvatar}
              alt={notification.senderName || "Workspace member"}
              fill
              sizes="36px"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {notification.senderName || "A workspace member"}
            </p>
            <time
              dateTime={notification.createdAt}
              className="text-xs text-muted-foreground"
            >
              {new Date(notification.createdAt).toLocaleString()}
            </time>
          </div>
        </div>
      </div>
      <dl className="divide-y divide-border rounded-panel border border-border bg-background px-4">
        {details.map(({ label, value }) => (
          <div
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 py-3 text-sm"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap break-words font-medium text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {notification.type === NotificationType.PROJECT_MEMBER_REMOVED && (
        <p className="text-sm text-muted-foreground">
          You no longer have access to this project or its linked documents and
          chat space.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {link && (
          <Button
            onClick={() => {
              onClose();
              router.push(link);
            }}
          >
            {isDocument
              ? notification.metadata?.itemType === "FOLDER"
                ? "Open folder"
                : "Open file"
              : "Open project"}
          </Button>
        )}
      </div>
    </div>
  );
}
