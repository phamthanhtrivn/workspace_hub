"use client";

import React from "react";
import { Notification } from "../types/notification.types";
import { getNotificationRenderer } from "./notification-registry";
import { DefaultListItemRenderer } from "./renderers/default-renderer";

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const renderer = getNotificationRenderer(notification.type);
  
  if (renderer) {
    const ListItem = renderer.listItemRenderer;
    return <ListItem notification={notification} onClick={() => onClick(notification)} />;
  }

  return <DefaultListItemRenderer notification={notification} onClick={() => onClick(notification)} />;
}
