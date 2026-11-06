import { test } from "node:test";
import assert from "node:assert/strict";
import { getProjectPermissions } from "./project-permissions";
import { ProjectRole, type Project, type ProjectMember, type Task } from "./types/project";

const project = { id: "project", ownerId: "owner" } as Project;
const member = {
  userId: "member", role: ProjectRole.MEMBER,
  canCreateTask: false, canEditOwnTask: false, canEditOthersTask: false,
  canManageMembers: false, canManageLabels: false, canEditDocuments: false,
} as ProjectMember;
const task = { createdBy: "creator", assignees: [{ userId: "member" }] } as Task;

test("assignment grants collaboration but not task or attachment editing", () => {
  const permissions = getProjectPermissions(project, [member], "member");
  assert.equal(permissions.canContributeTask(task), true);
  assert.equal(permissions.canEditTask(task), false);
  assert.equal(permissions.canEditDocuments, false);
});

test("own tasks and other members' tasks use separate edit permissions", () => {
  const permissions = getProjectPermissions(project, [{ ...member, canEditOwnTask: true }], "member");
  assert.equal(permissions.canEditTask({ createdBy: "member" }), true);
  assert.equal(permissions.canEditTask(task), false);
});

test("task edit access and Project Documents edit access remain independent", () => {
  const permissions = getProjectPermissions(project, [{ ...member, canEditOthersTask: true }], "member");
  assert.equal(permissions.canEditTask(task), true);
  assert.equal(permissions.canEditDocuments, false);
});

test("an Admin membership does not grant owner-only actions or implicit task editing", () => {
  const permissions = getProjectPermissions(project, [{ ...member, role: ProjectRole.ADMIN }], "member");
  assert.equal(permissions.canManageProject, false);
  assert.equal(permissions.canManagePermissions, false);
  assert.equal(permissions.canCreateTask, false);
  assert.equal(permissions.canEditTask(task), false);
  assert.equal(permissions.canEditDocuments, true);
});

test("the actual project owner has full project permissions", () => {
  const permissions = getProjectPermissions(project, [], "owner");
  assert.equal(permissions.canManageProject, true);
  assert.equal(permissions.canManagePermissions, true);
  assert.equal(permissions.canCreateTask, true);
  assert.equal(permissions.canEditTask(task), true);
  assert.equal(permissions.canEditDocuments, true);
});

test("an unknown user has no project write capabilities", () => {
  const permissions = getProjectPermissions(project, [member], null);
  assert.equal(permissions.canEditTask(task), false);
  assert.equal(permissions.canContributeTask(task), false);
  assert.equal(permissions.canManageProject, false);
});
