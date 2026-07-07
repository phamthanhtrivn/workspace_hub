import { Notification } from "../types/notification.types";

export interface NotificationRendererProps {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

export interface NotificationListItemProps {
  notification: Notification;
  onClick: () => void;
}

type NotificationRenderer = React.FC<NotificationRendererProps>;
type NotificationListItemRenderer = React.FC<NotificationListItemProps>;

interface RegistryEntry {
  modalRenderer: NotificationRenderer;
  listItemRenderer: NotificationListItemRenderer;
}

const registry = new Map<string, RegistryEntry>();

export function registerNotificationRenderer(
  type: string,
  modalRenderer: NotificationRenderer,
  listItemRenderer: NotificationListItemRenderer,
) {
  registry.set(type, { modalRenderer, listItemRenderer });
}

export function getNotificationRenderer(
  type: string,
): RegistryEntry | undefined {
  return registry.get(type);
}
