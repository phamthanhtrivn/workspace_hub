import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { mockModule, require } from "./test-runtime.mjs";

process.env.TZ = "Asia/Bangkok";
globalThis.focusApi = {};
mockModule("features/calendar/api/calendar.api.ts", `
 exports.getCalendars = (...args) => globalThis.focusApi.getCalendars(...args);
 exports.createCalendarEvent = (...args) => globalThis.focusApi.createCalendarEvent(...args);
`);
mockModule("features/project/api/project.api.ts", `exports.getProjects = (...args) => globalThis.focusApi.getProjects(...args);`);
mockModule("features/project/api/task.api.ts", `exports.getProjectTasks = (...args) => globalThis.focusApi.getProjectTasks(...args);`);
const { isCalendarFocusEligible, isProjectFocusEligible } = require("../utils/focus-task.ts");
const { createCalendarFocusTask, getAvailableProjectFocusTasks } = require("../api/focus-tasks.api.ts");
const { createCalendarEventFormDefaults } = require("../../calendar/utils/calendar-event-form.utils.ts");
const { readTaskDeadline } = require("../../calendar/utils/calendar-task-deadline.utils.ts");
const userId = "me";
const calendar = { id: "personal", ownerUserId: userId, projectId: null, isDefault: true };
const now = new Date(2026, 9, 4, 12);
const taskEvent = (start, end, overrides = {}) => ({ id: "event", calendarId: calendar.id, calendar, sourceType: "TASK", status: "CONFIRMED", allDay: true,
  startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), ...overrides });

beforeEach(() => {
  globalThis.focusApi = { getCalendars: async () => [calendar], createCalendarEvent: async (payload) => ({ id: "created", ...payload }) };
});

test("today's all-day task accepts Calendar's inclusive end and an exclusive midnight end", () => {
  assert.equal(isCalendarFocusEligible(taskEvent(new Date(2026, 9, 4), new Date(2026, 9, 4, 23, 59)), userId, "today", now), true);
  assert.equal(isCalendarFocusEligible(taskEvent(new Date(2026, 9, 4), new Date(2026, 9, 5)), userId, "today", now), true);
  assert.equal(isCalendarFocusEligible(taskEvent(new Date(2026, 9, 3), new Date(2026, 9, 4)), userId, "today", now), false);
});

test("Calendar focus excludes another owner's calendar, cancelled/completed tasks, and expired ranges", () => {
  const event = taskEvent(new Date(2026, 9, 4), new Date(2026, 9, 4, 23, 59));
  for (const overrides of [{ calendar: { ...calendar, ownerUserId: "other" } }, { status: "CANCELLED" }, { completedAt: now.toISOString() }, { permissions: { canManage: false } }]) {
    assert.equal(isCalendarFocusEligible({ ...event, ...overrides }, userId, "today", now), false);
  }
});

test("creating a task persists Calendar-compatible times, all-day flag and deadline without reminders", async () => {
  const values = createCalendarEventFormDefaults({ calendarId: calendar.id, draft: { startAt: new Date(2026, 9, 4), endAt: new Date(2026, 9, 4, 23, 59), allDay: true } }).values;
  let saved;
  globalThis.focusApi.createCalendarEvent = async (payload) => { saved = payload; return { id: "created", ...payload }; };
  const event = await createCalendarFocusTask({ ...values, title: "  Thesis task  ", description: "Research" }, userId, { enabled: true, date: "2026-10-05", time: "17:00" });
  assert.equal(saved.title, "Thesis task");
  assert.equal(saved.sourceType, "TASK");
  assert.equal(saved.allDay, true);
  assert.deepEqual(saved.reminders, []);
  assert.deepEqual(readTaskDeadline(saved.description), { date: "2026-10-05", time: "17:00" });
  assert.equal(isCalendarFocusEligible(event, userId, "today", now), true);
});

test("create boundary rejects invalid title/range, unavailable personal task storage, missing deadline and oversize description", async () => {
  const values = { ...createCalendarEventFormDefaults({ calendarId: calendar.id }).values, title: "Task" };
  let writes = 0;
  globalThis.focusApi.createCalendarEvent = async () => { writes++; };
  const deadline = { enabled: false, date: "", time: "" };
  await assert.rejects(createCalendarFocusTask({ ...values, title: "  " }, userId, deadline));
  await assert.rejects(createCalendarFocusTask({ ...values, endAt: values.startAt }, userId, deadline));
  await assert.rejects(createCalendarFocusTask(values, "other", deadline), /personal task list/);
  await assert.rejects(createCalendarFocusTask(values, userId, { ...deadline, enabled: true }), /deadline/);
  await assert.rejects(createCalendarFocusTask({ ...values, description: "x".repeat(2000) }, userId, deadline), /Shorten/);
  assert.equal(writes, 0);
});

test("task creation resolves the owned default calendar internally and ignores a supplied destination", async () => {
  const values = { ...createCalendarEventFormDefaults({ calendarId: "foreign" }).values, title: "Task" };
  globalThis.focusApi.getCalendars = async () => [
    { ...calendar, id: "project", projectId: "p1" },
    { ...calendar, id: "foreign", ownerUserId: "other" },
    { ...calendar, id: "secondary", isDefault: false },
    calendar,
  ];
  const event = await createCalendarFocusTask(values, userId, { enabled: false, date: "", time: "" });
  assert.equal(event.calendarId, calendar.id);
  assert.equal(event.calendar.id, calendar.id);
  assert.equal(event.sourceType, "TASK");
});

test("task creation without a calendar field falls back to the first owned personal calendar", async () => {
  const values = { ...createCalendarEventFormDefaults({ calendarId: "" }).values, title: "Task" };
  delete values.calendarId;
  globalThis.focusApi.getCalendars = async () => [
    { ...calendar, id: "project", projectId: "p1" },
    { ...calendar, id: "foreign", ownerUserId: "other" },
    { ...calendar, id: "first", isDefault: false },
    { ...calendar, id: "second", isDefault: false },
  ];
  const event = await createCalendarFocusTask(values, userId, { enabled: false, date: "", time: "" });
  assert.equal(event.calendarId, "first");
});

test("task creation never falls back to project or foreign calendars when personal storage is missing", async () => {
  const values = { ...createCalendarEventFormDefaults({ calendarId: calendar.id }).values, title: "Task" };
  let writes = 0;
  globalThis.focusApi.createCalendarEvent = async () => { writes++; };
  for (const calendars of [[], [
    { ...calendar, id: "project", projectId: "p1" },
    { ...calendar, id: "foreign", ownerUserId: "other" },
  ]]) {
    globalThis.focusApi.getCalendars = async () => calendars;
    await assert.rejects(createCalendarFocusTask(values, userId, { enabled: false, date: "", time: "" }), /personal task list/);
  }
  assert.equal(writes, 0);
});

test("project loading requests only active projects with assignments and paginates before loading onlyMine tasks", async () => {
  const calls = [];
  globalThis.focusApi.getProjects = async (query) => { calls.push(query); return { data: [{ id: `p${query.page}`, status: "ACTIVE", archived: false }], meta: { page: query.page, hasNext: query.page < 2, totalPages: 2 } }; };
  globalThis.focusApi.getProjectTasks = async (projectId, query) => {
    assert.deepEqual(query, { onlyMine: true });
    return [{ id: projectId, projectId, status: "TODO", assignees: [{ userId }], allDay: false }, { id: "other", projectId, status: "TODO", assignees: [{ userId: "other" }] }];
  };
  const results = await getAvailableProjectFocusTasks(userId);
  assert.equal(results.length, 2);
  assert.deepEqual(calls.map(({ page, status, hasAssignedTasks }) => ({ page, status, hasAssignedTasks })), [
    { page: 1, status: "ACTIVE", hasAssignedTasks: true }, { page: 2, status: "ACTIVE", hasAssignedTasks: true },
  ]);
  assert.equal(results.every(({ task }) => isProjectFocusEligible(task, userId)), true);
});
