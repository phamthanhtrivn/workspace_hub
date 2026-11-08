import assert from "node:assert/strict";
import { test } from "node:test";
import type { DocumentItem } from "../types/documents.types";
import { collectDocumentSelection } from "./document-list.api";

test("Select all fetches every page, including results not yet scrolled into view", async () => {
  const pages: number[] = [];
  const result = await collectDocumentSelection((page) => {
    pages.push(page);

    return Promise.resolve({
      data: [{ id: `file-${page}` } as DocumentItem],
      meta: { totalItems: 3, page, limit: 1, totalPages: 3 },
    });
  });
  assert.deepEqual(pages, [1, 2, 3]);
  assert.deepEqual(
    result.map((item) => item.id),
    ["file-1", "file-2", "file-3"],
  );
});

test("canceling Select all stops before loading subsequent pages", async () => {
  const controller = new AbortController();
  let pages = 0;
  await assert.rejects(
    collectDocumentSelection((page) => {
      pages++;
      controller.abort();

      return Promise.resolve({
        data: [{ id: "file" } as DocumentItem],
        meta: { totalItems: 2, page, limit: 1, totalPages: 2 },
      });
    }, controller.signal),
  );
  assert.equal(pages, 1);
});

test("changing pagination never silently returns an incomplete Select all result", async () => {
  await assert.rejects(
    collectDocumentSelection((page) =>
      Promise.resolve({
        data: [],
        meta: { totalItems: 2, page, limit: 12, totalPages: 1 },
      }),
    ),
    /changed during selection/,
  );
});

test("failed later pages reject Select all instead of returning a partial selection", async () => {
  await assert.rejects(
    collectDocumentSelection((page) => {
      if (page === 2) return Promise.reject(new Error("network unavailable"));

      return Promise.resolve({
        data: [{ id: "first" } as DocumentItem],
        meta: { totalItems: 2, page, limit: 1, totalPages: 2 },
      });
    }),
  );
});
