import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getProjects } from "@/features/project/api/project.api";
import { getProjectTasks, normalizeTask } from "@/features/project/api/task.api";
import { TaskPriority, TaskStatus, type Project } from "@/features/project/types/project";
import { getTodayProjectTasks } from "./today-project-tasks";

vi.mock("@/features/project/api/project.api", () => ({ getProjects: vi.fn() }));
vi.mock("@/features/project/api/task.api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/project/api/task.api")>(),
  getProjectTasks: vi.fn(),
}));

const project = { id: "project-1", name: "Workspace", color: "#123456" } as Project;
const task = (id: string, overrides = {}) => normalizeTask({
  id, projectId: project.id, taskNumber: 1, title: id, description: "",
  status: TaskStatus.TODO, priority: TaskPriority.MEDIUM,
  createdBy: "user-1", reporterId: "user-1", archived: false, allDay: false,
  estimatedMinutes: 50,
  startDate: new Date(2026, 8, 29, 9).toISOString(),
  dueDate: new Date(2026, 8, 29, 10).toISOString(),
  assignees: [{ id: "assignment", taskId: id, userId: "user-1", assignedAt: "2026-09-01" }],
  ...overrides,
});
const meta = (page: number, hasNext = false) => ({ page, limit: 10, total: 2, totalPages: 2, hasNext });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 29, 12));
  vi.mocked(getProjects).mockResolvedValue({ data: [project], meta: meta(1) });
});
afterEach(() => vi.useRealTimers());

it("keeps only assigned, unfinished tasks scheduled today across all project pages", async () => {
  const secondProject = { ...project, id: "project-2", name: "Second project" };
  vi.mocked(getProjects)
    .mockResolvedValueOnce({ data: [project], meta: meta(1, true) })
    .mockResolvedValueOnce({ data: [secondProject], meta: meta(2) });
  vi.mocked(getProjectTasks).mockImplementation(async (projectId) => projectId === project.id ? [
    task("mine"),
    task("other", { assignees: [{ userId: "user-2" }] }),
    task("unassigned", { assignees: [] }),
    task("done", { status: TaskStatus.DONE }),
    task("cancelled", { status: TaskStatus.CANCELLED }),
    task("archived", { archived: true }),
    task("completed", { completedAt: "2026-09-29T01:00:00Z" }),
    task("undated", { startDate: null, dueDate: null }),
    task("tomorrow", { startDate: new Date(2026, 8, 30, 9).toISOString(), dueDate: new Date(2026, 8, 30, 10).toISOString() }),
    task("yesterday", { startDate: new Date(2026, 8, 28, 9).toISOString(), dueDate: new Date(2026, 8, 28, 10).toISOString() }),
  ] : [task("second", { projectId: secondProject.id })]);

  const result = await getTodayProjectTasks("user-1");
  expect(result.map(({ task }) => task.id)).toEqual(["mine", "second"]);
  expect(result[1].project.name).toBe("Second project");
  expect(getProjects).toHaveBeenCalledWith({ page: 2, limit: 10 });
  expect(getProjectTasks).toHaveBeenCalledWith(project.id, { onlyMine: true });
});

it("handles local midnight, multi-day work, inclusive all-day dates and invalid ranges", async () => {
  const midnight = new Date(2026, 8, 29).toISOString();
  const tomorrow = new Date(2026, 8, 30).toISOString();
  vi.mocked(getProjectTasks).mockResolvedValue([
    task("multi-day", { startDate: new Date(2026, 8, 28, 9).toISOString(), dueDate: new Date(2026, 8, 30, 9).toISOString() }),
    task("ends-at-midnight", { startDate: new Date(2026, 8, 28, 9).toISOString(), dueDate: midnight }),
    task("starts-tomorrow", { startDate: tomorrow, dueDate: tomorrow }),
    task("instant-at-midnight", { startDate: midnight, dueDate: midnight }),
    task("all-day", { allDay: true, startDate: "2026-09-29T00:00:00.000Z", dueDate: "2026-09-29T00:00:00.000Z" }),
    task("all-day-ends-today", { allDay: true, startDate: "2026-09-28", dueDate: "2026-09-29" }),
    task("all-day-tomorrow", { allDay: true, startDate: "2026-09-30", dueDate: "2026-09-30" }),
    task("invalid", { startDate: "bad date" }),
    task("reversed", { startDate: tomorrow, dueDate: midnight }),
  ]);
  expect((await getTodayProjectTasks("user-1")).map(({ task }) => task.id).sort()).toEqual([
    "all-day", "all-day-ends-today", "instant-at-midnight", "multi-day",
  ]);
});

it("does not request tasks before a user is available", async () => {
  expect(await getTodayProjectTasks("")).toEqual([]);
  expect(getProjects).not.toHaveBeenCalled();
});

it("reports project fetch failures instead of claiming the list is empty", async () => {
  vi.mocked(getProjectTasks).mockRejectedValue(new Error("Project unavailable"));
  await expect(getTodayProjectTasks("user-1")).rejects.toThrow("Project unavailable");
});
