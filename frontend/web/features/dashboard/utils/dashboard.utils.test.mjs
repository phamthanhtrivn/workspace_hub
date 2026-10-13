import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

// Run pure TypeScript utilities with the project's compiler, without another test dependency.
const filename = path.join(directory, "dashboard.utils.ts");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(directory);
loaded._compile(compiled, filename);
const {
  dateInZone,
  dayBounds,
  sortTasks,
  taskBucket,
  buildDayItems,
  focusDays,
} = loaded.exports;
const task = (id, overrides = {}) => ({
  key: `project:${id}`,
  title: id,
  href: `/tasks/${id}`,
  source: "project",
  sourceId: id,
  priority: "MEDIUM",
  dateOnly: true,
  dueAt: null,
  ...overrides,
});

test("local date uses the selected timezone near midnight", () => {
  assert.equal(
    dateInZone("2026-10-04T18:00:00Z", "Asia/Ho_Chi_Minh"),
    "2026-10-05",
  );
  assert.equal(dateInZone("2026-10-04T18:00:00Z", "UTC"), "2026-10-04");
});
test("day bounds are exclusive and handle daylight saving changes", () => {
  const bounds = dayBounds("2026-03-08", "America/New_York");
  assert.equal(
    (Date.parse(bounds.endAt) - Date.parse(bounds.startAt)) / 3600000,
    23,
  );
  assert.equal(
    dayBounds("2026-10-05", "Asia/Ho_Chi_Minh").startAt,
    "2026-10-04T17:00:00Z",
  );
});
test("task counts keep overdue, today and undated tasks distinct", () => {
  assert.equal(
    taskBucket(task("old", { dueAt: "2026-10-04" }), "2026-10-05", "UTC"),
    "Overdue",
  );
  assert.equal(
    taskBucket(task("today", { dueAt: "2026-10-05" }), "2026-10-05", "UTC"),
    "Today",
  );
  assert.equal(taskBucket(task("undated"), "2026-10-05", "UTC"), "No deadline");
});
test("task sorting puts overdue ahead of priority and does not merge source IDs", () => {
  const sorted = sortTasks(
    [
      task("urgent", { dueAt: "2026-10-06", priority: "URGENT" }),
      task("old", { dueAt: "2026-10-04", priority: "LOW" }),
      task("today", { dueAt: "2026-10-05" }),
      task("old", { key: "calendar:old", dueAt: null }),
    ],
    "2026-10-05",
    "UTC",
  );
  assert.deepEqual(
    sorted.map((item) => item.key),
    ["project:old", "project:today", "project:urgent", "calendar:old"],
  );
});
test("timeline removes meeting mirrors and excludes cancelled events", () => {
  const events = [
    {
      id: "event1",
      title: "Mirror",
      startAt: "2026-10-05T09:00:00Z",
      endAt: "2026-10-05T10:00:00Z",
      sourceType: "USER",
    },
    {
      id: "cancelled",
      title: "Cancelled",
      startAt: "2026-10-05T11:00:00Z",
      endAt: "2026-10-05T12:00:00Z",
      status: "CANCELLED",
    },
  ];
  const meetings = [
    {
      id: "meeting1",
      title: "Meeting",
      joinToken: "abc",
      status: "SCHEDULED",
      description: "[Calendar Event:event1]",
      scheduledStartAt: "2026-10-05T09:00:00Z",
      scheduledEndAt: "2026-10-05T10:00:00Z",
    },
  ];
  assert.deepEqual(
    buildDayItems(events, [], meetings, "2026-10-05", "UTC").map(
      (item) => item.key,
    ),
    ["meeting:meeting1"],
  );
});
test("timeline keeps recurrence occurrences, all-day deadlines and overlapping events", () => {
  const events = [
    {
      id: "series",
      title: "Occurrence",
      startAt: "2026-10-05T09:00:00Z",
      endAt: "2026-10-05T10:00:00Z",
    },
    {
      id: "series",
      title: "Occurrence 2",
      startAt: "2026-10-05T11:00:00Z",
      endAt: "2026-10-05T12:00:00Z",
    },
    {
      id: "overlap",
      title: "Overnight",
      startAt: "2026-10-04T23:00:00Z",
      endAt: "2026-10-05T01:00:00Z",
    },
    {
      id: "tomorrow",
      title: "Tomorrow",
      startAt: "2026-10-06T00:00:00Z",
      endAt: "2026-10-06T01:00:00Z",
    },
  ];
  const items = buildDayItems(
    events,
    [task("deadline", { dueAt: "2026-10-05" })],
    [],
    "2026-10-05",
    "UTC",
  );
  assert.equal(items.length, 4);
  assert.equal(items[0].allDay, true);
  assert.equal(
    items.filter((item) => item.key.startsWith("event:series:")).length,
    2,
  );
});

test("new calendar conferences deduplicate using their meeting URL before an event ID tag exists", () => {
  const events = [
    {
      id: "event",
      title: "Conference",
      location: "https://workspace.example/meetings/token123",
      startAt: "2026-10-05T09:00:00Z",
      endAt: "2026-10-05T10:00:00Z",
    },
  ];
  const meetings = [
    {
      id: "meeting",
      joinToken: "token123",
      title: "Conference",
      description: "[Calendar Event]",
      scheduledStartAt: "2026-10-05T09:00:00Z",
      scheduledEndAt: "2026-10-05T10:00:00Z",
      status: "SCHEDULED",
    },
  ];
  assert.equal(
    buildDayItems(events, [], meetings, "2026-10-05", "UTC").length,
    1,
  );
});
test("focus report fills seven days, removes duplicate sessions and excludes breaks", () => {
  const session = {
    id: "focus",
    sessionType: "FOCUS",
    status: "COMPLETED",
    startedAt: "2026-10-04T18:00:00Z",
    actualSeconds: 1500,
  };
  const days = focusDays(
    [session, session, { ...session, id: "break", sessionType: "SHORT_BREAK" }],
    "2026-10-05",
    "Asia/Ho_Chi_Minh",
  );
  assert.equal(days.length, 7);
  assert.deepEqual(days.at(-1), {
    date: "2026-10-05",
    minutes: 25,
    sessions: 1,
  });
  assert.equal(days[0].minutes, 0);
});
