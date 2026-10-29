import {
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { WorkAssistantService } from "./work-assistant.service";
import { requireAssistantKey } from "./work-assistant.controller";
import type { PrismaService } from "../../common/prisma/prisma.service";

describe("read-only work assistant project context", () => {
  const userId = "10000000-0000-4000-8000-000000000001";
  const projectId = "10000000-0000-4000-8000-000000000002";
  const base = () => ({
    userId,
    projectId,
    audience: "mine" as const,
    now: new Date().toISOString(),
    from: new Date(Date.now() - 6 * 86400000).toISOString(),
    to: new Date(Date.now() + 86400000).toISOString(),
    timeZone: "Asia/Ho_Chi_Minh",
  });
  it("requires the dedicated service key before accepting an identity", () => {
    const previous = process.env.WORK_ASSISTANT_SERVICE_KEY;
    try {
      delete process.env.WORK_ASSISTANT_SERVICE_KEY;
      expect(() => requireAssistantKey("forged")).toThrow(
        ServiceUnavailableException,
      );
      process.env.WORK_ASSISTANT_SERVICE_KEY =
        "fixture-assistant-secret-at-least-32-characters";
      expect(() => requireAssistantKey("forged")).toThrow(
        UnauthorizedException,
      );
      expect(() =>
        requireAssistantKey(process.env.WORK_ASSISTANT_SERVICE_KEY),
      ).not.toThrow();
    } finally {
      if (previous === undefined) delete process.env.WORK_ASSISTANT_SERVICE_KEY;
      else process.env.WORK_ASSISTANT_SERVICE_KEY = previous;
    }
  });
  it("denies a revoked project before reading tasks", async () => {
    const db = {
      project: { findMany: jest.fn().mockResolvedValue([]) },
      task: { findMany: jest.fn() },
    };
    await expect(
      new WorkAssistantService(db as unknown as PrismaService).context(base()),
    ).rejects.toThrow(ForbiddenException);
    expect(db.task.findMany).not.toHaveBeenCalled();
  });
  it("keeps exact totals separate from capped model detail and excludes undated completions from punctuality", async () => {
    const now = new Date();
    const db = {
      project: { findMany: jest.fn().mockResolvedValue([{ id: projectId }]) },
      task: {
        groupBy: jest.fn().mockResolvedValue([
          { status: "TODO", _count: { _all: 120 } },
          { status: "DONE", _count: { _all: 3 } },
        ]),
        findMany: jest.fn().mockImplementation(({ select }) => {
          if (select.allDay && !select.id && !select.completedAt)
            return [
              { dueDate: new Date(now.getTime() - 3600000), allDay: false },
            ];
          if (select.completedAt)
            return [
              {
                dueDate: new Date(now.getTime() - 7200000),
                completedAt: new Date(now.getTime() - 8000000),
                allDay: false,
              },
              {
                dueDate: new Date(now.getTime() - 7200000),
                completedAt: now,
                allDay: false,
              },
              { dueDate: null, completedAt: now, allDay: false },
            ];
          return Array.from({ length: 61 }, (_, i) => ({
            id: "task-" + i,
            projectId,
            title: "Task " + i,
            description: "safe",
            status: "TODO",
            priority: "HIGH",
            allDay: false,
            startDate: null,
            dueDate: now,
            project: { name: "Project" },
            checklists: [],
            _count: { children: 0, checklists: 0, dependenciesFrom: 0 },
            dependenciesTo: [],
          }));
        }),
      },
    };
    const result = await new WorkAssistantService(
      db as unknown as PrismaService,
    ).context(base());
    expect(result.metrics.open).toBe(120);
    expect(result.metrics.completedInPeriod).toBe(3);
    expect(result.metrics.completedWithDeadline).toBe(2);
    expect(result.metrics.onTimeRate).toBe(0.5);
    expect(result.tasks).toHaveLength(60);
    expect(result.partial).toBe(true);
    expect(db.task.groupBy.mock.calls[0][0].where.assignees).toEqual({
      some: { userId },
    });
    expect(
      db.task.findMany.mock.calls.every(
        ([query]) =>
          !("comments" in query.select) &&
          !("documentAttachments" in query.select),
      ),
    ).toBe(true);
  });
  it("allows project overview only within the explicitly authorized project", async () => {
    const db = {
      project: { findMany: jest.fn().mockResolvedValue([{ id: projectId }]) },
      task: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    await new WorkAssistantService(db as unknown as PrismaService).context({
      ...base(),
      audience: "project",
    });
    const where = db.task.groupBy.mock.calls[0][0].where;
    expect(where.project.id).toBe(projectId);
    expect(where.project.OR).toEqual([
      { ownerId: userId },
      { members: { some: { userId, status: "ACTIVE" } } },
    ]);
    expect(where.assignees).toBeUndefined();
  });
});
