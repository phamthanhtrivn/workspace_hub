import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { Temporal } from "temporal-polyfill";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const requirePackage = createRequire(import.meta.url);

// Run the feature's TypeScript with Node's test runner, without adding a test dependency.
const webRoot = path.resolve(import.meta.dirname, "../../..");
function featureLoader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText;
    const localRequire = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return requirePackage(specifier);
      const base = specifier.startsWith("@/") ? path.join(webRoot, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!resolved) throw new Error(`Cannot resolve ${specifier}`);
      return load(resolved);
    };
    new Function("require", "module", "exports", source)(localRequire, compiledModule, compiledModule.exports);
    return compiledModule.exports;
  }
  return (relative) => load(path.join(webRoot, relative));
}

const taskInput = { title: "  Prepare thesis demo  ", deadline: { enabled: false, date: "", time: "" } };
const ownCalendar = { id: "own", ownerUserId: "member", projectId: null, isDefault: true };
function quickTaskApi(calendars = [ownCalendar]) {
  const writes = [];
  let reads = 0;
  const load = featureLoader({
    "@/features/calendar/api/calendar.api": {
      getCalendars: async () => { reads += 1; return calendars; },
      createCalendarEvent: async (payload) => { writes.push(payload); return { id: "created", ...payload }; },
    },
    "@/features/project/api/project.api": {},
    "@/features/project/api/pagination": {},
    "@/features/project/api/task.api": {},
    "@/features/meeting/api/meeting.api": {},
  });
  return { ...load("features/dashboard/api/dashboard.api.ts"), writes, get reads() { return reads; } };
}

test("invalid task titles and deadlines fail before calendar reads or writes", async () => {
  const api = quickTaskApi();
  for (const input of [
    { ...taskInput, title: "   " },
    { ...taskInput, title: "a".repeat(201) },
    { ...taskInput, deadline: { enabled: true, date: "2026-02-30", time: "" } },
    { ...taskInput, deadline: { enabled: true, date: "2026-10-21", time: "25:00" } },
    { ...taskInput, deadline: { enabled: true, date: "", time: "" } },
  ]) await assert.rejects(api.createDashboardQuickTask(input, "member", "Asia/Ho_Chi_Minh"));
  assert.equal(api.reads, 0);
  assert.equal(api.writes.length, 0);
});

test("quick create uses only the current user's personal calendar and workspace day", async () => {
  const api = quickTaskApi([
    { ...ownCalendar, id: "shared", ownerUserId: "someone-else" },
    { ...ownCalendar, id: "project", projectId: "team-project" },
    ownCalendar,
  ]);
  const zone = "Pacific/Kiritimati";
  const today = Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate();
  await api.createDashboardQuickTask({ ...taskInput, deadline: { enabled: true, date: "2026-10-25", time: "17:30" } }, "member", zone);
  assert.equal(api.writes.length, 1);
  const payload = api.writes[0];
  assert.equal(payload.calendarId, "own");
  assert.equal(payload.title, "Prepare thesis demo");
  assert.equal(payload.sourceType, "TASK");
  assert.equal(payload.allDay, true);
  assert.equal(payload.description, "[TASK]\n[Deadline: 2026-10-25 17:30]");
  assert.equal(payload.startAt, today.toZonedDateTime(zone).toInstant().toString());
  assert.equal(payload.endAt, today.add({ days: 1 }).toZonedDateTime(zone).toInstant().toString());
  assert.deepEqual(payload.reminders, []);
});

test("missing personal calendar or user never creates a task in a shared calendar", async () => {
  const api = quickTaskApi([{ ...ownCalendar, ownerUserId: "someone-else" }]);
  await assert.rejects(api.createDashboardQuickTask(taskInput, "member", "Asia/Ho_Chi_Minh"), /personal task list/);
  await assert.rejects(api.createDashboardQuickTask(taskInput, "", "Asia/Ho_Chi_Minh"));
  assert.equal(api.writes.length, 0);
});

test("turning off a deadline clears its stored marker", async () => {
  const api = quickTaskApi();
  await api.createDashboardQuickTask({ ...taskInput, deadline: { enabled: false, date: "2026-10-25", time: "17:30" } }, "member", "Asia/Ho_Chi_Minh");
  assert.equal(api.writes[0].description, "[TASK]");
});

test("dashboard preserves overdue/review tasks while offering focus only for eligible tasks", async () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const projectTask = { id: "ready", projectId: "project", title: "Assigned work", status: "TODO", priority: "MEDIUM", allDay: false, dueDate: future, assignees: [{ userId: "member" }] };
  const calendarTask = { id: "personal", calendarId: "own", title: "Personal work", sourceType: "TASK", startAt: new Date().toISOString(), endAt: future, allDay: false, description: "[TASK]" };
  const load = featureLoader({
    "@/features/calendar/api/calendar.api": {
      getCalendars: async () => [ownCalendar],
      getAllCalendarTasks: async () => [calendarTask, { ...calendarTask, id: "old-personal", startAt: past, endAt: past }],
    },
    "@/features/project/api/project.api": { getProjects: async () => ({ data: [{ id: "project", name: "Thesis", status: "ACTIVE" }], meta: {} }) },
    "@/features/project/api/pagination": { fetchAllPages: async (fetch) => (await fetch(1, 10)).items },
    "@/features/project/api/task.api": { getProjectTasks: async () => [projectTask, { ...projectTask, id: "review", status: "IN_REVIEW" }, { ...projectTask, id: "overdue", dueDate: past }, { ...projectTask, id: "other", assignees: [{ userId: "other" }] }] },
    "@/features/meeting/api/meeting.api": {},
  });
  const api = load("features/dashboard/api/dashboard.api.ts");
  const projects = await api.getProjectDashboardTasks("member");
  assert.deepEqual(projects.map((task) => task.sourceId), ["ready", "review", "overdue"]);
  assert.equal(projects[0].focusTask.projectId, "project");
  assert.equal(projects[0].focusTask.source, "PROJECT_TASK");
  assert.equal(projects[1].focusTask, undefined);
  assert.equal(projects[2].focusTask, undefined);
  const personal = await api.getPersonalDashboardTasks("member");
  assert.equal(personal[0].focusTask.calendarEventId, "personal");
  assert.equal(personal[1].focusTask, undefined);
});

test("task focus delegates to the shared session and reflects running/paused state", async () => {
  const started = [];
  let renderedButton;
  const target = { id: "task", source: "PROJECT_TASK", projectId: "project", title: "Thesis task" };
  const session = { startFocus: async (task) => { started.push(task); }, activeTask: null, status: "IDLE", busy: false, isReady: true };
  const load = featureLoader({
    "./pomodoro-session-provider": { usePomodoroSessionActions: () => session },
    "@/components/ui/button": { Button: (props) => {
      renderedButton = props;
      return React.createElement("button", null, props.children);
    } },
    "@/store/store": {},
    "@/features/project/hooks/use-projects": {},
  });
  const { TaskFocusButton } = load("features/pomodoro/components/task-focus-button.tsx");
  const button = () => {
    renderToStaticMarkup(React.createElement(TaskFocusButton, { target }));
    return renderedButton;
  };
  assert.equal(button().disabled, false);
  await button().onClick({ stopPropagation() {} });
  assert.deepEqual(started, [target]);
  session.activeTask = target;
  session.status = "RUNNING";
  assert.equal(button().disabled, true);
  assert.equal(button()["aria-label"], "Focusing: Thesis task");
  session.status = "PAUSED";
  assert.equal(button().disabled, false);
  assert.equal(button()["aria-label"], "Resume focus: Thesis task");
  session.busy = true;
  assert.equal(button().disabled, true);
});

test("task navigation and focus render as separate controls", () => {
  const load = featureLoader({
    "./pomodoro-session-provider": { usePomodoroSessionActions: () => ({ activeTask: null, status: "IDLE", busy: false, isReady: true }) },
    "@/store/store": {},
    "@/features/project/hooks/use-projects": {},
  });
  const { DashboardTaskItem } = load("features/dashboard/components/tasks/dashboard-task-item.tsx");
  const task = { key: "project:task", sourceId: "task", source: "project", title: "Thesis task", priority: "MEDIUM", href: "/projects/project?taskId=task", dueAt: null, dateOnly: false,
    focusTask: { id: "task", source: "PROJECT_TASK", projectId: "project", title: "Thesis task" } };
  const html = renderToStaticMarkup(React.createElement(DashboardTaskItem, { task, today: "2026-10-21", zone: "Asia/Ho_Chi_Minh" }));
  assert.match(html, /aria-label="Open Thesis task"/);
  assert.match(html, /aria-label="Start focus: Thesis task"/);
  assert.doesNotMatch(html, /<a\b[^>]*>[\s\S]*?<button\b[\s\S]*?<\/a>/);
});

test("shared task fields associate errors with the correct input and preserve form registration", () => {
  const load = featureLoader();
  const { CalendarTaskTitleField } = load("features/calendar/components/modal/calendar-task-title-field.tsx");
  const { CalendarTaskDeadlineFields } = load("features/calendar/components/modal/calendar-task-deadline-fields.tsx");
  for (const invalidField of ["title", "deadline"]) {
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(CalendarTaskTitleField, { id: "task-title", name: "title", defaultValue: "Thesis task", "data-modal-initial-focus": true, error: invalidField === "title" ? "Enter a title." : undefined }),
      React.createElement(CalendarTaskDeadlineFields, { value: { enabled: true, date: "2026-10-21", time: "17:00" }, onChange() {}, error: invalidField === "deadline" ? "Check the deadline." : undefined }),
    ));
    const titleInput = html.match(/<input\b[^>]*id="task-title"[^>]*>/)[0];
    const dateInput = html.match(/<button\b[^>]*aria-label="Deadline"[^>]*>/)[0];
    assert.match(titleInput, /name="title"/);
    assert.match(titleInput, /maxLength="200"/i);
    assert.match(titleInput, /data-modal-initial-focus="true"/);
    assert.match(html, /<label[^>]*for="task-title"/);
    const invalidInput = invalidField === "title" ? titleInput : dateInput;
    const validInput = invalidField === "title" ? dateInput : titleInput;
    assert.match(invalidInput, /aria-invalid="true"/);
    assert.doesNotMatch(validInput, /aria-invalid="true"/);
    const describedBy = invalidInput.match(/aria-describedby="([^"]+)"/)[1];
    assert.ok(html.includes(`id="${describedBy}" role="alert"`));
  }
});

test("date/time picker values preserve date-only identity and exact minutes", () => {
  const load = featureLoader();
  const { parseDatePickerValue, formatDatePickerValue, parseTimePickerValue } = load("components/ui/custom/date-time-picker.utils.ts");
  for (const value of ["2026-10-21", "2028-02-29", "2026-03-08", "2026-11-01"]) {
    assert.equal(formatDatePickerValue(parseDatePickerValue(value)), value);
  }
  for (const value of ["", "2026-02-30", "2026-2-03", "2026-13-01", "2026-10-21T00:00:00Z"]) {
    assert.equal(parseDatePickerValue(value), undefined);
  }
  assert.deepEqual(parseTimePickerValue("13:07"), { hour: "13", minute: "07" });
  assert.deepEqual(parseTimePickerValue("00:00"), { hour: "00", minute: "00" });
  assert.deepEqual(parseTimePickerValue("23:59"), { hour: "23", minute: "59" });
  for (const value of ["", "24:00", "13:60", "1:07"]) {
    assert.deepEqual(parseTimePickerValue(value), { hour: "", minute: "" });
  }
});

test("shared deadline pickers replace native widgets, preserve required dates and disable during saving", () => {
  const { CalendarTaskDeadlineFields } = featureLoader()("features/calendar/components/modal/calendar-task-deadline-fields.tsx");
  const html = renderToStaticMarkup(React.createElement(CalendarTaskDeadlineFields, {
    value: { enabled: true, date: "2026-10-21", time: "13:07" }, onChange() {}, disabled: true,
  }));
  assert.doesNotMatch(html, /type="(?:date|time|datetime-local)"/);
  assert.match(html, />21\/10\/2026</);
  assert.match(html, />13:07</);
  assert.match(html, /<input\b[^>]*required=""[^>]*disabled=""/);
  for (const label of ["Deadline", "Deadline time", "Remove deadline"]) {
    const button = html.match(new RegExp(`<button\\b[^>]*aria-label="${label}"[^>]*>`))[0];
    assert.match(button, /disabled=""/);
  }
});
