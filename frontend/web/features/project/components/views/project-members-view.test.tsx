import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectMembersView from "./project-members-view";
import {
  ProjectRole,
  type ProjectMember,
  type Task,
} from "../../types/project";

vi.mock("@/features/project/components/ui/avatar-stack", () => ({
  Avatar: () => <span data-testid="member-avatar" />,
}));

vi.mock("@/features/project/hooks/use-invitations", () => ({
  usePendingProjectInvitations: () => ({ data: [] }),
  useCancelProjectInvitation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useResendProjectInvitation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateProjectInvitation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/features/project/hooks/use-project-members", () => ({
  useRemoveProjectMember: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProjectMemberPermissions: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

afterEach(cleanup);

const mockMembers: ProjectMember[] = [
  {
    id: "member-owner",
    projectId: "project-1",
    userId: "user-owner",
    displayName: "Việt Nhân Trần",
    role: ProjectRole.OWNER,
    canCreateTask: true,
    canEditOwnTask: true,
    canEditOthersTask: true,
    canManageSprints: true,
    canManageMembers: true,
    canManageLabels: true,
    joinedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "member-developer",
    projectId: "project-1",
    userId: "user-dev",
    displayName: "asd",
    role: ProjectRole.MEMBER,
    canCreateTask: true,
    canEditOwnTask: true,
    canEditOthersTask: false,
    canManageSprints: false,
    canManageMembers: false,
    canManageLabels: false,
    joinedAt: "2026-09-10T00:00:00.000Z",
  },
];

const mockTasks: Task[] = [
  {
    id: "task-1",
    projectId: "project-1",
    taskNumber: 1,
    title: "Setup API",
    status: "IN_PROGRESS" as any,
    priority: "HIGH" as any,
    assignees: [{ userId: "user-dev", displayName: "asd" }],
    labels: [],
    checklistTotal: 0,
    checklistCompleted: 0,
    archived: false,
    createdAt: "2026-09-11T00:00:00.000Z",
  },
];

describe("ProjectMembersView", () => {
  it("renders metric cards and lists project members with roles", () => {
    render(
      <ProjectMembersView
        projectId="project-1"
        members={mockMembers}
        tasks={mockTasks}
        canInvite
        canManagePermissions
        canRemoveMembers
        currentUserId="user-owner"
      />,
    );

    // Metric cards
    expect(screen.getByText("Việt Nhân Trần")).toBeTruthy();
    expect(screen.getByText("asd")).toBeTruthy();
    expect(screen.getByText("Total Members")).toBeTruthy();
    expect(screen.getByText("Owners & Admins")).toBeTruthy();

    // You badge on current user
    expect(screen.getByText("You")).toBeTruthy();

    // Task count for asd
    expect(screen.getByText("1 tasks")).toBeTruthy();
  });

  it("filters members by search query", () => {
    render(
      <ProjectMembersView
        projectId="project-1"
        members={mockMembers}
        tasks={mockTasks}
        canInvite
        canManagePermissions
        canRemoveMembers
        currentUserId="user-owner"
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Search members by name...",
    );
    fireEvent.change(searchInput, { target: { value: "Việt" } });

    expect(screen.getByText("Việt Nhân Trần")).toBeTruthy();
    expect(screen.queryByText("asd")).toBeNull();
  });

  it("filters members by role tab", () => {
    render(
      <ProjectMembersView
        projectId="project-1"
        members={mockMembers}
        tasks={mockTasks}
        canInvite
        canManagePermissions
        canRemoveMembers
        currentUserId="user-owner"
      />,
    );

    const membersTab = screen.getByRole("button", { name: /Members \(1\)/i });
    fireEvent.click(membersTab);

    expect(screen.getByText("asd")).toBeTruthy();
    expect(screen.queryByText("Việt Nhân Trần")).toBeNull();
  });
});
