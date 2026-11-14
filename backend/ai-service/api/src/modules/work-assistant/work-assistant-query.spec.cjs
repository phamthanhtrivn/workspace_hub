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
