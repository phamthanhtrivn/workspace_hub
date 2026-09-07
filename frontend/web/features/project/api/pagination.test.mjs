import assert from "node:assert/strict";
import test from "node:test";

import { fetchAllPages } from "./pagination.ts";

test("fetchAllPages collects every page in order", async () => {
  const requestedPages = [];
  const pages = new Map([
    [1, { items: ["a", "b"], meta: { page: 1, limit: 2, total: 3, totalPages: 2, hasNext: true } }],
    [2, { items: ["c"], meta: { page: 2, limit: 2, total: 3, totalPages: 2, hasNext: false } }],
  ]);

  const result = await fetchAllPages(async (page, limit) => {
    requestedPages.push([page, limit]);
    return pages.get(page);
  }, 2);

  assert.deepEqual(result, ["a", "b", "c"]);
  assert.deepEqual(requestedPages, [[1, 2], [2, 2]]);
});

test("fetchAllPages keeps compatibility with responses that have no metadata", async () => {
  let callCount = 0;

  const result = await fetchAllPages(async () => {
    callCount += 1;
    return { items: ["only-page"] };
  });

  assert.deepEqual(result, ["only-page"]);
  assert.equal(callCount, 1);
});
