const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

test("revoked project content is masked in English without translating accessible messages", async () => {
  const { WorkAssistantAccessService } = load(
    "src/modules/work-assistant/work-assistant-access.service.ts",
    {
      "./work-context": { WorkContextService: class {} },
      "./work-store": { WorkStore: class {} },
    },
  );
  const access = new WorkAssistantAccessService(
    { authorize: async () => new Set(["allowed"]) },
    {},
  );
  const visible = {
    content: "N\u1ed9i dung c\u1ee7a b\u1ea1n",
    project_ids: ["allowed"],
    sources: [],
  };
  const privateMessage = {
    content: "Private text",
    project_ids: ["revoked"],
    sources: [{ id: "private-task" }],
  };
  const messages = await access.visible({ id: "owner" }, [
    visible,
    privateMessage,
  ]);
  assert.equal(messages[0], visible);
  assert.equal(
    messages[1].content,
    "Content was hidden because project access has changed.",
  );
  assert.equal(messages[1].hidden, true);
  assert.deepEqual(messages[1].sources, []);
  assert.deepEqual(messages[1].project_ids, []);
  assert.equal(privateMessage.content, "Private text");
});

test("conversation labels are English while authorized user titles and paging are preserved", async () => {
  const { WorkAssistantQueryService } = load(
    "src/modules/work-assistant/work-assistant-query.service.ts",
    {
      "./work-context": { WorkContextService: class {} },
      "./work-store": { WorkStore: class {} },
      "./work-assistant-access.service": {
        WorkAssistantAccessService: class {},
      },
    },
  );
  const userTitle = "K\u1ebf ho\u1ea1ch  h\u1ecdc t\u1eadp";
  const sessions = [
    { id: "empty", content: null, project_ids: [] },
    {
      id: "revoked",
      content: "Private project title",
      project_ids: ["revoked-project"],
    },
    { id: "owned", content: userTitle, project_ids: ["allowed-project"] },
  ];
  const queries = new WorkAssistantQueryService(
    {
      requireScope: async () => {},
      authorize: async () => new Set(["allowed-project"]),
    },
    { list: async () => ({ sessions, nextCursor: "next-page" }) },
    { scope: () => ({ audience: "mine" }) },
  );
  const { data } = await queries.sessions(
    { id: "owner" },
    { contextType: "projects" },
  );
  assert.equal(data.sessions[0].title, "New conversation");
  assert.equal(data.sessions[1].title, "Previous conversation");
  assert.equal(data.sessions[2].title, userTitle.replace(/\s+/g, " "));
  assert.equal(data.nextCursor, "next-page");
  assert.equal(sessions[1].content, "Private project title");
});

test("cache permission stamps change on revocation and verification failures never approve cached content", async () => {
  const { WorkAssistantQueryService } = load(
    "src/modules/work-assistant/work-assistant-query.service.ts",
    {
      "./work-context": { WorkContextService: class {} },
      "./work-store": { WorkStore: class {} },
      "./work-assistant-access.service": {
        WorkAssistantAccessService: class {},
      },
    },
  );
  let allowed = new Set(["a", "b"]);
  const queries = new WorkAssistantQueryService(
    { requireScope: async () => {}, authorize: async () => allowed },
    { referencedProjects: async () => ["b", "a"] },
    { scope: () => ({}) },
  );
  const first = await queries.cacheAccess(
    { id: "owner" },
    { contextType: "dashboard" },
  );
  allowed = new Set(["a"]);
  const revoked = await queries.cacheAccess(
    { id: "owner" },
    { contextType: "dashboard" },
  );
  assert.notEqual(first.data.permissionStamp, revoked.data.permissionStamp);
  queries.context.authorize = async () => {
    throw Error("Project unavailable");
  };
  await assert.rejects(
    queries.cacheAccess({ id: "owner" }, { contextType: "dashboard" }),
  );
});

test("request reconciliation checks session ownership/context before reading status and never starts generation", async () => {
  const { WorkAssistantQueryService } = load(
    "src/modules/work-assistant/work-assistant-query.service.ts",
    {
      "./work-context": { WorkContextService: class {} },
      "./work-store": { WorkStore: class {} },
      "./work-assistant-access.service": {
        WorkAssistantAccessService: class {},
      },
    },
  );
  const calls = [];
  const queries = new WorkAssistantQueryService(
    {},
    {
      requestStatus: async () => {
        calls.push("status");
        return "COMPLETED";
      },
    },
    {
      owned: async () => {
        calls.push("access");
      },
    },
  );
  assert.deepEqual(
    await queries.requestStatus({ id: "owner" }, "session", "request", {
      contextType: "projects",
    }),
    { data: { status: "COMPLETED" } },
  );
  assert.deepEqual(calls, ["access", "status"]);
  queries.access.owned = async () => {
    throw Error("Forbidden");
  };
  await assert.rejects(
    queries.requestStatus({ id: "other" }, "session", "request", {
      contextType: "projects",
    }),
  );
  assert.deepEqual(calls, ["access", "status"]);
});
