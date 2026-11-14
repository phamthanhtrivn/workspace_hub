import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { TaskAttachmentService } from "./task-attachment.service";
import { ProjectAccessService } from "../project/project-access.service";
import type { PrismaService } from "../../common/prisma/prisma.service";
import type { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import type { ActivityService } from "../activity/activity.service";
import type { TaskDocumentClient } from "./task-document.client";
import type { TaskLookupService } from "./task-lookup.service";
import { TaskDocumentAttachmentSource } from "./task-document.enums";

function fixture(
  options: {
    ownTask?: boolean;
    editOwn?: boolean;
    editOthers?: boolean;
    owner?: boolean;
    active?: boolean;
  } = {},
) {
  const userId = "member";
  const attachment = {
    id: "attachment",
    taskId: "task",
    projectId: "project",
    documentItemId: "document",
    source: TaskDocumentAttachmentSource.PROJECT_DOCUMENT,
    name: "Review.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10n,
    attachedBy: "creator",
    createdAt: new Date(),
  };
  const task = {
    id: "task",
    projectId: "project",
    createdBy: options.ownTask ? userId : "creator",
    status: "TODO",
    assignees: [{ userId }],
    documentAttachments: [attachment],
  };
  const calls = { document: 0, transaction: 0, deletion: 0 };
  const document = {
    id: "document",
    projectId: "project",
    name: "Review.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10,
  };
  const database = {
    project: {
      findUnique: async () => ({
        id: "project",
        ownerId: options.owner ? userId : "owner",
        status: "ACTIVE",
        setting: {},
      }),
    },
    projectMember: {
      findUnique: async () => ({
        status: options.active === false ? "LEFT" : "ACTIVE",
        canEditOwnTask: Boolean(options.editOwn),
        canEditOthersTask: Boolean(options.editOthers),
      }),
    },
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => {
      calls.transaction++;
      return operation({
        taskDocumentAttachment: {
          findMany: async () => [],
          create: async ({ data }: { data: object }) => data,
          delete: async () => {
            calls.deletion++;
            return attachment;
          },
        },
      });
    },
  };
  const prisma = database as unknown as PrismaService;
  const documents = {
    resolveProjectFiles: async () => {
      calls.document++;
      return [document];
    },
    importPersonalFiles: async () => {
      calls.document++;
      return [document];
    },
  };
  const service = new TaskAttachmentService(
    new ProjectAccessService(prisma),
    {
      getProfileByUserId: async () => ({ email: "test@example.invalid" }),
    } as unknown as UserProfileSnapshotService,
    prisma,
    { record: async () => undefined } as unknown as ActivityService,
    documents as unknown as TaskDocumentClient,
    { findTask: async () => task } as unknown as TaskLookupService,
  );
  return { service, calls, userId };
}

for (const source of Object.values(TaskDocumentAttachmentSource)) {
  test(`an assignee without Edit other members' tasks cannot attach via ${source}`, async () => {
    const context = fixture();
    await assert.rejects(
      context.service.attachDocuments(context.userId, "task", {
        source,
        documentItemIds: ["document"],
      }),
      (error) => {
        assert.ok(error instanceof ForbiddenException);
        assert.match(error.message, /Edit other members' tasks/);
        return true;
      },
    );
    assert.deepEqual(context.calls, {
      document: 0,
      transaction: 0,
      deletion: 0,
    });
  });
}

test("being assigned to a task does not grant permission to remove an attachment", async () => {
  const context = fixture();
  await assert.rejects(
    context.service.detachDocument(context.userId, "task", "attachment"),
    ForbiddenException,
  );
  assert.equal(context.calls.transaction, 0);
  assert.equal(context.calls.deletion, 0);
});

test("a read-only member can still list task attachments", async () => {
  const context = fixture();
  const attachments = await context.service.listDocuments(
    context.userId,
    "task",
  );
  assert.equal(attachments[0].documentItemId, "document");
  assert.equal(attachments[0].name, "Review.pdf");
  assert.equal(context.calls.transaction, 0);
});

test("editing other tasks does not grant the missing Edit own tasks permission", async () => {
  const context = fixture({ ownTask: true, editOthers: true });
  await assert.rejects(
    context.service.attachDocuments(context.userId, "task", {
      source: TaskDocumentAttachmentSource.MY_FILES,
      documentItemIds: ["document"],
    }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(error.message, /Edit own tasks/);
      return true;
    },
  );
  assert.equal(context.calls.document, 0);
});

test("a creator with Edit own tasks can attach personal files", async () => {
  const context = fixture({ ownTask: true, editOwn: true });
  const attachments = await context.service.attachDocuments(
    context.userId,
    "task",
    {
      source: TaskDocumentAttachmentSource.MY_FILES,
      documentItemIds: ["document"],
    },
  );
  assert.equal(attachments.length, 1);
  assert.equal(context.calls.document, 1);
  assert.equal(context.calls.transaction, 1);
});

test("Edit other members' tasks allows removing task attachments", async () => {
  const context = fixture({ editOthers: true });
  await context.service.detachDocument(context.userId, "task", "attachment");
  assert.equal(context.calls.deletion, 1);
});

test("the project owner can attach task documents", async () => {
  const context = fixture({ owner: true });
  await context.service.attachDocuments(context.userId, "task", {
    source: TaskDocumentAttachmentSource.PROJECT_DOCUMENT,
    documentItemIds: ["document"],
  });
  assert.equal(context.calls.transaction, 1);
});

test("a removed project member cannot read or modify task attachments", async () => {
  const context = fixture({ active: false, editOthers: true });
  await assert.rejects(
    context.service.listDocuments(context.userId, "task"),
    ForbiddenException,
  );
  await assert.rejects(
    context.service.detachDocument(context.userId, "task", "attachment"),
    ForbiddenException,
  );
  assert.equal(context.calls.transaction, 0);
});
