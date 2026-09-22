import { describe, expect, it } from "vitest";
import { buildProjectTaskQuery } from "./project-task-view";
import { TaskPriority, TaskStatus } from "./types/project";

describe("buildProjectTaskQuery", () => {
  it("maps search, status, priority, and only-my filters to API query params", () => {
    expect(
      buildProjectTaskQuery({
        searchQuery: "  login  ",
        assigneeIds: [],
        onlyMyIssues: true,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        quickAssignee: "",
      }),
    ).toEqual({
      search: "login",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      onlyMine: true,
    });
  });

  it("maps selected assignee avatars to a comma-separated assignee query", () => {
    expect(
      buildProjectTaskQuery({
        searchQuery: "",
        assigneeIds: ["user-1", "user-2"],
        onlyMyIssues: false,
        status: "",
        priority: "",
        quickAssignee: "",
      }),
    ).toEqual({ assigneeUserIds: "user-1,user-2" });
  });

  it("lets quick assignee override avatar assignee filters", () => {
    expect(
      buildProjectTaskQuery({
        searchQuery: "",
        assigneeIds: ["user-1"],
        onlyMyIssues: false,
        status: "",
        priority: "",
        quickAssignee: "user-2",
      }),
    ).toEqual({ assigneeUserIds: "user-2" });
  });

  it("maps the unassigned quick filter to unassigned=true", () => {
    expect(
      buildProjectTaskQuery({
        searchQuery: "",
        assigneeIds: ["user-1"],
        onlyMyIssues: false,
        status: "",
        priority: "",
        quickAssignee: "UNASSIGNED",
      }),
    ).toEqual({ unassigned: true });
  });
});
