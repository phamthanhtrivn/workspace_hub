import { test } from "node:test";
import assert from "node:assert/strict";
import type { GetNotificationsResponse } from "../types/notification.types";
import { getNotificationSnapshot } from "./notification-snapshot";

const response: GetNotificationsResponse = {
  message: "Loaded",
  data: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 4,
    totalPages: 1,
    unreadCount: 4,
  },
};

test("a fetched notification snapshot repairs a stale global badge without a socket event", () => {
  assert.equal(getNotificationSnapshot(response).unreadCount, 4);
  assert.equal(getNotificationSnapshot(response).total, 4);
});
test("a date-filtered list must not replace the global bell count with a partial count", () => {
  assert.equal(
    getNotificationSnapshot(response, { fromDate: "2026-11-10T00:00:00Z" })
      .unreadCount,
    undefined,
  );
  assert.equal(
    getNotificationSnapshot(response, { toDate: "2026-11-10T23:59:59Z" })
      .unreadCount,
    undefined,
  );
});
