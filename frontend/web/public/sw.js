self.addEventListener("push", function (event) {
  if (!event.data) {
    console.warn("Push event received but no data payload found.");
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || "WorkspaceHub";

    const options = {
      body: data.content || "You have a new notification.",
      icon: data.senderAvatar || "/vercel.svg",
      badge: "/next.svg",
      vibrate: [100, 50, 100],
      data: {
        link: data.link || "/chat",
      },
      tag:
        data.metadata?.invitationId ||
        data.metadata?.spaceId ||
        "workspace-hub-space-notification",
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Error displaying push notification:", error);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetLink = event.notification.data?.link || "/chat";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({ type: "NAVIGATE", url: targetLink });
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetLink);
        }
      }),
  );
});
