export const notificationKeys = {
  root: ["notifications"] as const,
  lists: () => [...notificationKeys.root, "list"] as const,
  unreadCount: () => [...notificationKeys.root, "unread-count"] as const,
};
