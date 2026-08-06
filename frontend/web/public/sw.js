self.addEventListener("push", function (event) {
  if (!event.data) {
    console.warn("Push event received but no data payload found.");
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || "Tin nhắn mới";
    
    const options = {
      body: data.content || "Bạn có tin nhắn mới.",
      icon: data.senderAvatar || "/vercel.svg", // Fallback icon
      badge: "/next.svg", // Fallback badge
      vibrate: [100, 50, 100],
      data: {
        link: data.link || "/chat",
      },
      tag: data.metadata?.conversationId || "workspace-hub-chat-msg", // collapse notifications from the same room
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
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it and redirect
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "NAVIGATE", url: targetLink });
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetLink);
      }
    }),
  );
});
