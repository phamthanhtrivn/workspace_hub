import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { ConversationTasksController } from "./conversation-tasks.controller";
import { ConversationTasksService } from "./conversation-tasks.service";
import { JwtIdentityGuard } from "../../common/guards/jwt-identity.guard";

const key = "fixture-project-conversation-key-not-production-000";
const body = { userId: "11111111-1111-4111-8111-111111111111", scope: "today" };
describe("internal conversation tasks HTTP boundary", () => {
  let app: import("@nestjs/common").INestApplication;
  let base: string;
  const list = jest.fn().mockResolvedValue({ available: true, tasks: [] });
  const previous = process.env.AI_PROJECT_SERVICE_KEY;
  beforeAll(async () => {
    process.env.AI_PROJECT_SERVICE_KEY = key;
    const module = await Test.createTestingModule({
      controllers: [ConversationTasksController],
      providers: [
        { provide: ConversationTasksService, useValue: { list } },
        { provide: APP_GUARD, useClass: JwtIdentityGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
    if (previous === undefined) delete process.env.AI_PROJECT_SERVICE_KEY;
    else process.env.AI_PROJECT_SERVICE_KEY = previous;
  });
  const send = (payload: object, suppliedKey?: string) =>
    fetch(base + "/internal/conversation-tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": body.userId,
        ...(suppliedKey ? { "x-internal-service-key": suppliedKey } : {}),
      },
      body: JSON.stringify(payload),
    });
  it("rejects forged user headers without the dedicated key", async () => {
    expect((await send(body)).status).toBe(401);
    expect((await send(body, "wrong")).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });
  it("validates identity, scope and unexpected fields even with the correct key", async () => {
    for (const invalid of [
      { ...body, userId: "invalid" },
      { ...body, scope: "all-users" },
      { ...body, assigneeId: body.userId },
    ])
      expect((await send(invalid, key)).status).toBe(400);
  });
  it("returns typed task data only after authentication and validation", async () => {
    const response = await send(body, key);
    expect(response.status).toBe(201);
    expect(list).toHaveBeenCalledWith(body.userId, "today", undefined);
  });
  it("disables the endpoint when its own key is missing", async () => {
    delete process.env.AI_PROJECT_SERVICE_KEY;
    try {
      expect((await send(body, key)).status).toBe(503);
    } finally {
      process.env.AI_PROJECT_SERVICE_KEY = key;
    }
  });
});
