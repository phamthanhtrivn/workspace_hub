import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { mockModule, require } from "./test-runtime.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLFormElement", "Node", "Element", "Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "MutationObserver", "DocumentFragment"]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: name === "window" ? dom.window : dom.window[name] });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.self = dom.window;
globalThis.PointerEvent = dom.window.MouseEvent;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLElement.prototype.hasPointerCapture = () => false;
dom.window.HTMLElement.prototype.setPointerCapture = () => {};
dom.window.HTMLElement.prototype.releasePointerCapture = () => {};

mockModule("store/store.ts", `exports.useAppSelector = (select) => select({ auth: { userId: "me" } });`);
mockModule("features/pomodoro/hooks/use-pomodoro-timer.ts", `exports.usePomodoroTimer = () => globalThis.fixture.timer;`);
mockModule("features/pomodoro/hooks/use-pomodoro-task-actions.ts", `
 exports.usePomodoroTaskActions = () => ({taskRevision: 0, runTaskAction: async () => {}});
 exports.taskActionErrorMessage = (error) => error.message;
`);
mockModule("features/calendar/hooks/use-calendar-queries.ts", `
 exports.calendarKeys = { all: ["calendar"] };
 exports.useCalendarCalendars = () => ({data: globalThis.fixture.calendars, isLoading: false, isError: false,
   refetch: async () => {globalThis.fixture.calendarRetries = (globalThis.fixture.calendarRetries || 0) + 1;},
   ...globalThis.fixture.calendarQuery});
`);
mockModule("features/calendar/api/calendar.api.ts", `
 exports.getCalendars = async () => globalThis.fixture.calendars;
 exports.getCalendarEvent = async (id) => {
   if(globalThis.fixture.failValidation) throw new Error("Task unavailable");
   return globalThis.fixture.events.find(event => event.id === id);
 };
 exports.createCalendarEvent = async (payload) => {
   globalThis.fixture.writes.push(payload);
   if(globalThis.fixture.failCreate) throw new Error("Calendar save failed");
   const event = {id: "created", status: "CONFIRMED", ...payload};
   globalThis.fixture.events.push(event);
   return event;
 };
`);
mockModule("features/project/hooks/use-projects.ts", `exports.useProject = () => ({});`);
mockModule("features/project/api/project.api.ts", `
 exports.getProject = async (id) => globalThis.fixture.projectTasks.find(entry => entry.project.id === id).project;
 exports.getProjectMembers = async () => [];
`);
mockModule("features/project/api/task.api.ts", `
 exports.getTask = async (id) => globalThis.fixture.projectTasks.find(entry => entry.task.id === id).task;
 exports.updateTask = async (id, payload) => ({...globalThis.fixture.projectTasks.find(entry => entry.task.id === id).task, ...payload});
`);
mockModule("features/pomodoro/hooks/use-focus-task-options.ts", `
 exports.useFocusTaskOptions = () => ({userId: "me", calendar: {data: globalThis.fixture.events}, project: {data: globalThis.fixture.projectTasks}});
`);
mockModule("features/pomodoro/components/task-focus-history.tsx", `exports.TaskFocusHistory = () => null;`);

const React = require("react");
const { render, screen, fireEvent, waitFor, cleanup, within, act } = require("@testing-library/react");
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
const { PomodoroSessionProvider, usePomodoroSessionActions } = require("../components/pomodoro-session-provider.tsx");
const { PomodoroActiveTaskCard } = require("../components/pomodoro-active-task.tsx");
const { PomodoroProjectTaskPanel } = require("../components/pomodoro-project-task-panel.tsx");

beforeEach(() => {
  const fixture = globalThis.fixture = {
    calendars: [{ id: "personal", ownerUserId: "me", projectId: null, name: "Personal", isDefault: true }],
    events: [], projectTasks: [], writes: [], switches: [],
  };
  fixture.timer = {
    isReady: true, isTaskActionPending: false, status: "RUNNING", mode: "FOCUS", timeLeft: 1200,
    activeTask: { id: "old", source: "PERSONAL_GOAL", title: "Current thesis work" }, notes: "Keep these notes",
    config: { focusDuration: 25 }, sessionRevision: 0,
    updateActiveTask: (task) => { fixture.timer.activeTask = task; },
    resume: () => { fixture.timer.status = "RUNNING"; },
    beginFocusTask: async (task, prepare) => {
      if (fixture.failSwitch) throw new Error("Session save failed");
      const prepared = await prepare(task);
      fixture.switches.push(prepared);
      fixture.timer.activeTask = prepared;
    },
    beginFreeFocus: async () => { fixture.switches.push(null); fixture.timer.activeTask = null; },
    start: () => {}, setNotes: () => {}, stopSession: async () => {}, selectTask: async () => {},
  };
});
afterEach(() => { cleanup(); document.body.style.overflow = ""; });

function mount(child = React.createElement(PomodoroActiveTaskCard)) {
  return render(React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    React.createElement(PomodoroSessionProvider, null, child)));
}
function clickTab(name) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}
function openCreate() {
  fireEvent.click(screen.getByRole("button", { name: "Change focus" }));
  clickTab("Calendar tasks");
  fireEvent.click(screen.getByRole("button", { name: "New task" }));
}

test("Change focus opens one modal, keeps timer and notes, traps focus and restores the trigger on Escape", () => {
  mount();
  const trigger = screen.getByRole("button", { name: "Change focus" });
  trigger.focus();
  fireEvent.click(trigger);
  assert.equal(screen.getAllByRole("dialog").length, 1);
  assert.equal(globalThis.fixture.timer.timeLeft, 1200);
  assert.equal(globalThis.fixture.timer.status, "RUNNING");
  assert.equal(globalThis.fixture.timer.notes, "Keep these notes");
  const dialog = screen.getByRole("dialog");
  const last = within(dialog).getByRole("button", { name: "Start free focus" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  assert.equal(document.activeElement, within(dialog).getByRole("button", { name: "Close focus picker" }));
  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  assert.equal(screen.queryByRole("dialog") === null, true);
  assert.equal(document.activeElement, trigger);
  assert.deepEqual(globalThis.fixture.switches, []);
});

test("Free focus confirmation stays in the modal; cancel keeps the old session and double submit switches once", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Change focus" }));
  fireEvent.click(screen.getByRole("button", { name: "Start free focus" }));
  assert.equal(screen.getAllByRole("dialog").length, 1);
  fireEvent.click(screen.getByRole("button", { name: "Keep current session" }));
  assert.equal(globalThis.fixture.timer.activeTask.id, "old");
  fireEvent.click(screen.getByRole("button", { name: "Start free focus" }));
  const confirm = screen.getByRole("button", { name: "Save & switch task" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true));
  assert.deepEqual(globalThis.fixture.switches, [null]);
});

test("New task shows Task / My tasks without a calendar picker; cancelling confirmation preserves the saved ID and form", async () => {
  globalThis.fixture.calendars = [
    { id: "project", ownerUserId: "me", projectId: "p1", isDefault: true },
    { id: "foreign", ownerUserId: "other", projectId: null, isDefault: true },
    { id: "secondary", ownerUserId: "me", projectId: null, isDefault: false },
    ...globalThis.fixture.calendars,
  ];
  mount(); openCreate();
  assert.ok(screen.getByRole("dialog", { name: "New task" }));
  assert.ok(screen.getByText("Task", { exact: true }));
  assert.ok(screen.getByText("My tasks", { exact: true }));
  assert.equal(screen.queryByRole("combobox", { name: "Personal calendar" }), null);
  assert.equal(screen.queryByText("Choose a personal calendar"), null);
  assert.ok(screen.getByLabelText("Start date"));
  assert.ok(screen.getByLabelText("End date"));
  assert.ok(screen.getByRole("checkbox", { name: "All day" }));
  assert.equal(screen.queryByLabelText("Focus sessions"), null);
  fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "New thesis task" } });
  fireEvent.change(screen.getByLabelText("Description (optional)"), { target: { value: "Saved description" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "All day" }));
  fireEvent.click(screen.getByRole("button", { name: "Add deadline" }));
  fireEvent.change(screen.getByLabelText("Deadline"), { target: { value: "2027-01-01" } });
  fireEvent.change(screen.getByLabelText("Deadline time"), { target: { value: "17:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Create task & start focus" }));
  await screen.findByRole("button", { name: "Save & switch task" });
  assert.equal(globalThis.fixture.writes.length, 1);
  assert.equal(globalThis.fixture.writes[0].calendarId, "personal");
  assert.equal(globalThis.fixture.writes[0].sourceType, "TASK");
  assert.equal(globalThis.fixture.writes[0].allDay, true);
  assert.ok(globalThis.fixture.writes[0].description.includes("[Deadline: 2027-01-01 17:00]"));
  fireEvent.click(screen.getByRole("button", { name: "Keep current session" }));
  assert.equal(screen.getByLabelText("Task title").value, "New thesis task");
  assert.equal(screen.getByLabelText("Description (optional)").value, "Saved description");
  fireEvent.click(screen.getByRole("button", { name: "Start created task" }));
  fireEvent.click(await screen.findByRole("button", { name: "Save & switch task" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true));
  assert.equal(globalThis.fixture.writes.length, 1);
  assert.equal(globalThis.fixture.switches.length, 1);
  assert.equal(globalThis.fixture.timer.activeTask.title, "New thesis task");
  assert.ok(screen.getByRole("heading", { name: "New thesis task" }));
});

test("failed switch keeps confirmation and retries the saved task without another Calendar write", async () => {
  mount(); openCreate();
  fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Retry task" } });
  fireEvent.click(screen.getByRole("button", { name: "Create task & start focus" }));
  const confirm = await screen.findByRole("button", { name: "Save & switch task" });
  globalThis.fixture.failSwitch = true;
  fireEvent.click(confirm);
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Save & switch task" }).disabled, false));
  assert.equal(globalThis.fixture.timer.activeTask.id, "old");
  globalThis.fixture.failSwitch = false;
  fireEvent.click(screen.getByRole("button", { name: "Save & switch task" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true));
  assert.equal(globalThis.fixture.writes.length, 1);
  assert.equal(globalThis.fixture.switches.length, 1);
});

test("creating from the initial inline picker opens a form modal and a missing personal calendar disables save", () => {
  globalThis.fixture.timer.activeTask = null;
  globalThis.fixture.timer.status = "IDLE";
  globalThis.fixture.calendars = [
    { id: "project", ownerUserId: "me", projectId: "p1", isDefault: true },
    { id: "foreign", ownerUserId: "other", projectId: null, isDefault: true },
  ];
  mount();
  assert.equal(screen.queryByRole("button", { name: "Change focus" }), null);
  clickTab("Calendar tasks");
  fireEvent.click(screen.getByRole("button", { name: "New task" }));
  assert.equal(screen.getAllByRole("dialog").length, 1);
  assert.equal(screen.getByRole("button", { name: "Create task & start focus" }).disabled, true);
  assert.ok(screen.getByText(/Your personal task list is unavailable/));
  assert.equal(screen.queryByRole("combobox", { name: "Personal calendar" }), null);
  fireEvent.click(screen.getByRole("button", { name: "Back to tasks" }));
  assert.equal(screen.getByRole("tab", { name: "Calendar tasks" }).getAttribute("aria-selected"), "true");
});

test("time Select popup handles Escape without closing the focus modal", async () => {
  mount(); openCreate();
  const select = screen.getByRole("combobox", { name: "Start" });
  fireEvent.keyDown(select, { key: "ArrowDown" });
  const listbox = await screen.findByRole("listbox");
  const option = within(listbox).getAllByRole("option")[0];
  assert.ok(option.closest('[data-slot="select-content"]').className.includes("z-[120]"));
  fireEvent.keyDown(option, { key: "Escape" });
  await waitFor(() => assert.equal(screen.queryByRole("listbox") === null, true));
  assert.equal(screen.getAllByRole("dialog").length, 1);
});

test("personal task list loading disables creation", () => {
  globalThis.fixture.calendarQuery = { isLoading: true };
  mount(); openCreate();
  assert.equal(screen.getByRole("button", { name: "Create task & start focus" }).disabled, true);
  assert.equal(screen.queryByRole("combobox", { name: "Personal calendar" }), null);
  assert.equal(globalThis.fixture.writes.length, 0);
});

test("personal task list query errors disable creation and provide retry", async () => {
  globalThis.fixture.calendarQuery = { isError: true };
  mount(); openCreate();
  assert.equal(screen.getByRole("button", { name: "Create task & start focus" }).disabled, true);
  assert.ok(screen.getByText("Unable to load your personal task list."));
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  assert.equal(globalThis.fixture.calendarRetries, 1);
  assert.equal(globalThis.fixture.writes.length, 0);
});

test("form validates an empty title and displays Calendar API errors while keeping the draft", async () => {
  mount(); openCreate();
  fireEvent.submit(screen.getByLabelText("Task title").closest("form"));
  await waitFor(() => assert.equal(screen.getByLabelText("Task title").getAttribute("aria-invalid"), "true"));
  assert.equal(globalThis.fixture.writes.length, 0);
  globalThis.fixture.failCreate = true;
  fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Draft task" } });
  fireEvent.click(screen.getByRole("button", { name: "Create task & start focus" }));
  await screen.findByText("Calendar save failed");
  assert.equal(screen.getByLabelText("Task title").value, "Draft task");
  assert.equal(globalThis.fixture.timer.activeTask.id, "old");
  assert.deepEqual(globalThis.fixture.switches, []);
});

test("short focus settings still create a valid Calendar time range", async () => {
  globalThis.fixture.timer.config.focusDuration = 1;
  mount(); openCreate();
  fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Short focus task" } });
  fireEvent.click(screen.getByRole("button", { name: "Create task & start focus" }));
  await screen.findByRole("button", { name: "Save & switch task" });
  assert.equal(globalThis.fixture.writes.length, 1);
  const { startAt, endAt } = globalThis.fixture.writes[0];
  assert.equal(Date.parse(endAt) - Date.parse(startAt), 15 * 60_000);
});

test("Focus action outside the modal still uses the provider's confirmation dialog", async () => {
  function ExternalFocus() {
    const { startFreeFocus } = usePomodoroSessionActions();
    return React.createElement("button", { onClick: () => void startFreeFocus() }, "External focus");
  }
  mount(React.createElement(ExternalFocus));
  fireEvent.click(screen.getByRole("button", { name: "External focus" }));
  assert.ok(screen.getByRole("dialog", { name: "Switch focus task" }));
  fireEvent.click(screen.getByRole("button", { name: "Save & switch task" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true));
  assert.deepEqual(globalThis.fixture.switches, [null]);
});

test("switching to an assigned project task prepares its status and closes the modal after confirmation", async () => {
  globalThis.fixture.projectTasks = [{
    task: { id: "assigned", projectId: "p1", title: "Assigned project task", status: "TODO", assignees: [{ userId: "me" }], allDay: false },
    project: { id: "p1", name: "Thesis project", ownerId: "me", status: "ACTIVE", archived: false },
  }];
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Change focus" }));
  clickTab("Project tasks");
  fireEvent.click(screen.getByRole("button", { name: "All eligible tasks" }));
  fireEvent.click(screen.getByRole("button", { name: "Start focus: Assigned project task" }));
  fireEvent.click(screen.getByRole("button", { name: "Save & switch task" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true));
  assert.equal(globalThis.fixture.switches.length, 1);
  assert.equal(globalThis.fixture.timer.activeTask.projectId, "p1");
  assert.equal(globalThis.fixture.timer.activeTask.projectStatus, "IN_PROGRESS");
  assert.ok(screen.getByRole("heading", { name: "Assigned project task" }));
});

test("project dropdown drops unassigned projects and resets a selection removed on refresh", async () => {
  const assigned = { task: { id: "assigned", projectId: "p1", title: "Assigned task", status: "TODO", assignees: [{ userId: "me" }] }, project: { id: "p1", name: "Assigned project", status: "ACTIVE", archived: false } };
  let update;
  function Panel() {
    const [tasks, setTasks] = React.useState([assigned, { ...assigned, task: { ...assigned.task, id: "foreign", projectId: "p2", assignees: [{ userId: "other" }] }, project: { ...assigned.project, id: "p2", name: "Other project" } }]);
    const [projectId, setProjectId] = React.useState("p1");
    update = setTasks;
    return React.createElement(PomodoroProjectTaskPanel, { tasks, userId: "me", filters: { scope: "all", search: "" }, onFiltersChange: () => {}, projectId, onProjectChange: setProjectId, isLoading: false, isError: false, onRetry: () => {} });
  }
  mount(React.createElement(Panel));
  assert.equal(screen.getByRole("combobox", { name: "Filter by project" }).textContent, "Assigned project");
  await act(async () => update([]));
  assert.equal(screen.getByRole("combobox", { name: "Filter by project" }).textContent, "All projects");
  assert.equal(screen.queryByText("Other project"), null);
});
