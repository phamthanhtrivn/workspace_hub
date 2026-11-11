import { test } from "node:test";
import assert from "node:assert/strict";
import { listenForNotificationAlerts } from "./notification-alert-events";
import {
  NOTIFICATION_CHANGED_EVENT,
  NOTIFICATION_RECEIVED_EVENT,
} from "./notification-category.utils";
import { NotificationType } from "../types/notification.types";

test("loading/filtering notification lists is silent, while a real new event alerts once", () => {
  const target = new EventTarget();
  let count = 0;
  const stop = listenForNotificationAlerts(target, new Set(), true, () => {
    count++;
  });
  const detail = {
    id: "invitation",
    type: NotificationType.SPACE_INVITATION,
    isRead: false,
  };
  target.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED_EVENT, { detail }));
  assert.equal(count, 0);
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail }),
  );
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail }),
  );
  assert.equal(count, 1);
  stop();
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_RECEIVED_EVENT, {
      detail: { ...detail, id: "second" },
    }),
  );
  assert.equal(count, 1);
});
test("muted or read notifications never alert and are not replayed on filter/mute changes", () => {
  const target = new EventTarget();
  const seen = new Set<string>();
  let count = 0;
  const detail = {
    id: "muted",
    type: NotificationType.SPACE_INVITATION,
    isRead: false,
  };
  const stop = listenForNotificationAlerts(target, seen, false, () => {
    count++;
  });
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail }),
  );
  stop();
  const stopEnabled = listenForNotificationAlerts(target, seen, true, () => {
    count++;
  });
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail }),
  );
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_RECEIVED_EVENT, {
      detail: { ...detail, id: "read", isRead: true },
    }),
  );
  assert.equal(count, 0);
  stopEnabled();
});
