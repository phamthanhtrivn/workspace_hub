import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api } from "@/lib/axios";
import {
  notificationListOptions,
  type NotificationListFilters,
} from "./notification-list.api";
import {
  NotificationType,
  type GetNotificationsResponse,
} from "../types/notification.types";
import { getNotificationFeed } from "../utils/notification-feed";

const filters: NotificationListFilters = {
  viewerId: "recipient",
  category: "ALL",
  readFilter: "ALL",
  dateRange: {},
};

function response(
  page: number,
  firstId = (page - 1) * 10,
): GetNotificationsResponse {
  return {
    message: "Notifications retrieved",
    data: Array.from({ length: page === 3 ? 5 : 10 }, (_, index) => ({
      id: String(firstId + index),
      recipientId: "recipient",
      type: NotificationType.DOCUMENT_SHARED,
      title: "Shared file",
      content: "Details",
      isRead: false,
      createdAt: "2026-11-11T00:00:00Z",
      updatedAt: "2026-11-11T00:00:00Z",
    })),
    pagination: {
      page,
      limit: 10,
      total: 25,
      totalPages: 3,
      unreadCount: 25,
      categoryUnreadCount: 25,
    },
  };
}

function setup(context: TestContext) {
  const originalAdapter = api.defaults.adapter;
  const requests: Array<{ page: number; limit: number; category?: string }> =
    [];
  let failNext = false;
  api.defaults.adapter = (config) => {
    const params = config.params as {
      page: number;
      limit: number;
      category?: string;
    };
    requests.push(params);
    if (failNext) {
      failNext = false;

      return Promise.reject(
        new AxiosError("Temporary failure", "ERR_NETWORK", config),
      );
    }

    return Promise.resolve({
      config,
      data: response(params.page),
      status: 200,
      statusText: "OK",
      headers: {},
    });
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const observer = new InfiniteQueryObserver(
    client,
    notificationListOptions(filters),
  );
  const unsubscribe = observer.subscribe(() => undefined);
  context.after(() => {
    unsubscribe();
    client.clear();
    api.defaults.adapter = originalAdapter;
  });

  return {
    observer,
    requests,
    failNextRequest: () => {
      failNext = true;
    },
  };
}

test("the bell loads 10 initially, appends 10 and stops after the final partial page", async (context) => {
  const { observer, requests } = setup(context);
  let result = await observer.refetch();
  assert.equal(result.data?.pages.flatMap((page) => page.data).length, 10);
  result = await observer.fetchNextPage();
  assert.equal(result.data?.pages.flatMap((page) => page.data).length, 20);
  result = await observer.fetchNextPage();
  assert.equal(result.data?.pages.flatMap((page) => page.data).length, 25);
  assert.equal(observer.getCurrentResult().hasNextPage, false);
  assert.deepEqual(
    requests.map(({ page, limit }) => ({ page, limit })),
    [
      { page: 1, limit: 10 },
      { page: 2, limit: 10 },
      { page: 3, limit: 10 },
    ],
  );
});

test("closing and reopening with the same filters retains loaded pages; changing filters restarts at 10", async (context) => {
  const { observer } = setup(context);
  await observer.refetch();
  await observer.fetchNextPage();
  observer.setOptions({ ...notificationListOptions(filters), enabled: false });
  assert.equal(observer.getCurrentResult().data?.pages.length, 2);
  observer.setOptions({ ...notificationListOptions(filters), enabled: true });
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data?.pages.length, 2);
  observer.setOptions(
    notificationListOptions({ ...filters, category: "DOCUMENT" }),
  );
  await observer.refetch();
  assert.equal(
    observer.getCurrentResult().data?.pages.flatMap((page) => page.data).length,
    10,
  );
  await new Promise((resolve) => setTimeout(resolve, 1));
  observer.setOptions(notificationListOptions(filters));
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data?.pages.length, 1);
});

test("a failed load more preserves loaded notifications and retries the same next page", async (context) => {
  const { observer, failNextRequest, requests } = setup(context);
  await observer.refetch();
  failNextRequest();
  let result = await observer.fetchNextPage();
  assert.equal(result.isFetchNextPageError, true);
  assert.equal(result.data?.pages.flatMap((page) => page.data).length, 10);
  result = await observer.fetchNextPage();
  assert.equal(result.data?.pages.flatMap((page) => page.data).length, 20);
  assert.deepEqual(
    requests.map((request) => request.page),
    [1, 2, 2],
  );
});

test("overlapping pages never duplicate items and date-filtered totals cannot overwrite the global badge", () => {
  const pages = [response(1), response(2, 9)];
  const feed = getNotificationFeed(pages, "DOCUMENT", {});
  assert.equal(feed.list.length, 19);
  assert.equal(feed.snapshot?.unreadCount, 25);
  assert.equal(feed.total, 25);
  const filtered = getNotificationFeed(pages, "DOCUMENT", {
    fromDate: "2026-11-11T00:00:00Z",
  });
  assert.ok(filtered.snapshot && !("unreadCount" in filtered.snapshot));
});

test("a live refresh keeps all loaded pages instead of replacing them with the first 10", async (context) => {
  const { observer } = setup(context);
  await observer.refetch();
  await observer.fetchNextPage();
  await observer.refetch({ cancelRefetch: false });
  const result = observer.getCurrentResult();
  assert.equal(result.data?.pages.length, 2);
  assert.equal(
    getNotificationFeed(result.data?.pages ?? [], "ALL", {}).list.length,
    20,
  );
});

test("load more uses the latest response's unread counts rather than the first page's older count", () => {
  const pages = [response(1), response(2)];
  pages[1].pagination.unreadCount = 15;
  const feed = getNotificationFeed(pages, "ALL", {});
  assert.equal(feed.snapshot?.unreadCount, 15);
});
