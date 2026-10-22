const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  conversationHistory,
  retrievalQuestion,
} = require("../dist/modules/chat/chat-history");
const source = { id: "a", revision: "r1", status: "READY" };
const message = (role, content, refs = [{ id: "a", revision: "r1" }]) => ({
  role,
  content,
  sources: refs,
});
test("history includes only complete pairs with selected, unchanged sources and bounded text", () => {
  const messages = Array.from({ length: 6 }, (_, i) => [
    message("USER", `Question ${i}`),
    message("ASSISTANT", "x".repeat(1200) + " [[S9]]"),
  ]).flat();
  const history = conversationHistory(messages, [source]);
  assert.equal(history.length, 6);
  assert.ok(history.every((t) => t.content.length <= 1000));
  assert.deepEqual(
    conversationHistory(messages, [{ ...source, revision: "r2" }]),
    [],
  );
  assert.deepEqual(
    conversationHistory(messages, [{ ...source, status: "UNAVAILABLE" }]),
    [],
  );
  assert.deepEqual(conversationHistory(messages, []), []);
  assert.deepEqual(
    conversationHistory([message("USER", "failed request")], [source]),
    [],
  );
  assert.deepEqual(
    conversationHistory(
      [
        message("USER", "a"),
        message("ASSISTANT", "b", [{ id: "other", revision: "r1" }]),
      ],
      [source],
    ),
    [],
  );
  assert.ok(
    !conversationHistory(
      [message("USER", "a"), message("ASSISTANT", "b [[S9]]")],
      [source],
    )[1].content.includes("[["),
  );
});
test("follow-up retrieval expands with previous question while independent questions do not", () => {
  const history = [
    { role: "user", content: "Ngân sách dự án là bao nhiêu?" },
    { role: "assistant", content: "500 USD" },
  ];
  assert.match(retrievalQuestion("giải thích thêm", history), /Ngân sách/);
  assert.equal(
    retrievalQuestion("Thời hạn dự án?", history),
    "Thời hạn dự án?",
  );
  assert.equal(retrievalQuestion("giải thích thêm", []), "giải thích thêm");
});
