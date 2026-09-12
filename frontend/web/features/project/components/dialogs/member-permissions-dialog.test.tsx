import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemberPermissionsDialog from "./member-permissions-dialog";
import { ProjectRole, type ProjectMember } from "../../types/project";

vi.mock("@/features/project/components/ui/avatar-stack", () => ({
  Avatar: ({ user }: { user: { displayName: string } }) => (
    <span data-testid="member-avatar">{user.displayName}</span>
  ),
}));

afterEach(cleanup);

const member: ProjectMember = {
  id: "member-1",
  projectId: "project-1",
  userId: "user-1",
  displayName: "Viet Nhan Tran",
  role: ProjectRole.MEMBER,
  canCreateTask: true,
  canEditOwnTask: true,
  canEditOthersTask: false,
  canManageSprints: false,
  canManageMembers: false,
  canManageLabels: false,
  joinedAt: "2026-09-12T00:00:00.000Z",
};

describe("MemberPermissionsDialog", () => {
  it("separates default member access from additional permissions", () => {
    render(
      <MemberPermissionsDialog
        member={member}
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Always available to project members")).toBeTruthy();
    expect(screen.getByText("View and discuss")).toBeTruthy();
    expect(screen.getByText("Contribute to assigned tasks")).toBeTruthy();
    expect(screen.getByText("Additional permissions")).toBeTruthy();
    expect(screen.getByText("2/6 enabled")).toBeTruthy();
    expect(
      screen.getByText(/based on who created the task, not who is assigned/i),
    ).toBeTruthy();
  });

  it("saves the updated additional permissions", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MemberPermissionsDialog
        member={member}
        open
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /manage sprints/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save permissions" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        canCreateTask: true,
        canEditOwnTask: true,
        canEditOthersTask: false,
        canManageSprints: true,
        canManageMembers: false,
        canManageLabels: false,
      }),
    );
  });
});
