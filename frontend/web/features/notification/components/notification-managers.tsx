"use client";

import ChatMessageAlertManager from "./chat-message-alert-manager";
import PushSubscriptionManager from "./push-subscription-manager";
import ServiceWorkerNavigationListener from "./service-worker-navigation-listener";
import SpaceNotificationAlertManager from "./space-notification-alert-manager";

export default function NotificationManagers() {
  return (
    <>
      <PushSubscriptionManager />
      <ServiceWorkerNavigationListener />
      <SpaceNotificationAlertManager />
      <ChatMessageAlertManager />
    </>
  );
}
