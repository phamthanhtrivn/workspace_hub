import {
  ConversationTasksService,
  conversationTaskWhere,
  taskDay,
} from "./conversation-tasks.service";
import { PrismaService } from "../../common/prisma/prisma.service";

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

describe("conversation task queries", () => {
  it.each([
    ["2026-10-23T16:59:00Z", "2026-10-23", "2026-10-22T17:00:00.000Z"],
    ["2026-10-23T17:00:00Z", "2026-10-24", "2026-10-23T17:00:00.000Z"],
    ["2026-12-31T17:00:00Z", "2027-01-01", "2026-12-31T17:00:00.000Z"],
  ])("uses the Vietnam day for %s", (instant, date, start) => {
    const day = taskDay(new Date(instant));
    expect(day.date).toBe(date);
    expect(day.start.toISOString()).toBe(start);
    expect(day.end.getTime() - day.start.getTime()).toBe(86400000);
  });

  it("requires both assignment and owner/active-member project access", () => {
    const where = conversationTaskWhere(userId, "open", new Date(), projectId);
    expect(where).toMatchObject({
      projectId,
      archived: false,
      deletedAt: null,
      status: { notIn: ["DONE", "CANCELLED"] },
      assignees: { some: { userId } },
      project: {
        archived: false,
        status: { not: "ARCHIVED" },
        OR: [
          { ownerId: userId },
          { members: { some: { userId, status: "ACTIVE" } } },
        ],
      },
    });
  });

  it("keeps all-day deadlines valid through their Vietnam calendar day", () => {
    const now = new Date("2026-10-24T07:00:00Z");
    expect(conversationTaskWhere(userId, "overdue", now).OR).toEqual([
      { allDay: true, dueDate: { lt: new Date("2026-10-23T17:00:00Z") } },
      { allDay: false, dueDate: { lt: now } },
    ]);
  });

  it("bounds output and excludes task descriptions, comments and assignee profiles", async () => {
    const task = {
      id: "task",
      title: "Test",
      taskNumber: 1,
      projectId,
      status: "TODO",
      priority: "HIGH",
      startDate: null,
      dueDate: new Date("2026-10-25T09:00:00Z"),
      allDay: false,
      project: { name: "Demo" },
    };
    const findMany = jest
      .fn()
      .mockResolvedValue(Array.from({ length: 31 }, () => task));
    const service = new ConversationTasksService({
      task: { findMany },
    } as unknown as PrismaService);
    const result = await service.list(userId, "open");
    expect(result.tasks).toHaveLength(30);
    expect(result.hasMore).toBe(true);
    expect(result.tasks[0]).not.toHaveProperty("description");
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty("description");
    expect(findMany.mock.calls[0][0].take).toBe(31);
  });
});
