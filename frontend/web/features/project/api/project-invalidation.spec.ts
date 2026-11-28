import { test } from "node:test";
import * as assert from "node:assert/strict";
import { projectQueriesForEvent } from "./project-invalidation";

test("project identity caches refresh on icon edits and membership changes without refreshing unrelated projects", () => {
  for (const resource of ["PROJECT", "MEMBER"] as const) {
    const filters = projectQueriesForEvent({ projectId: "project-a", resource });
    assert.ok(filters.some(filter => JSON.stringify(filter.queryKey) === '["projects","project-a","notification-identity"]'));
    assert.ok(!filters.some(filter => filter.queryKey[1] === "project-b"));
  }
});

test("Calendar project choices refresh for project and access changes only", () => {
  for (const change of [
    { resource: "PROJECT" },
    { resource: "MEMBER" },
    { resource: "INVITATION", data: { status: "ACCEPTED" } },
  ] as const) {
    const filters = projectQueriesForEvent({
      projectId: "project-a",
      ...change,
    });
    assert.ok(
      filters.some(
        (filter) =>
          JSON.stringify(filter.queryKey) === '["projects","calendar-list"]',
      ),
    );
  }
  for (const resource of [
    "TASK",
    "COMMENT",
    "CHECKLIST",
    "LABEL",
    "DEPENDENCY",
  ] as const) {
    const filters = projectQueriesForEvent({
      projectId: "project-a",
      resource,
      taskId: "task-a",
    });
    assert.ok(
      !filters.some(
        (filter) =>
          JSON.stringify(filter.queryKey) === '["projects","calendar-list"]',
      ),
    );
    assert.ok(
      !filters.some(
        (filter) => JSON.stringify(filter.queryKey) === '["projects"]',
      ),
    );
    assert.ok(!filters.some((filter) => filter.queryKey[1] === "project-b"));
    assert.ok(!filters.some((filter) => filter.queryKey[2] === "documents"));
  }
});
