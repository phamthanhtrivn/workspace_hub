import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const source = readFileSync(
  new URL("../features/ai/api/stream.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpile(source, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
});
const { readAnswer, parseEvent } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);
function stream(text, size = 1) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += size)
        controller.enqueue(bytes.slice(i, i + size));
      controller.close();
    },
  });
}
test("SSE preserves Vietnamese UTF-8 across arbitrary network chunk boundaries", async () => {
  const events = [];
  await readAnswer(
    stream(
      'event: delta\ndata: {"text":"Tài liệu tiếng Việt"}\n\nevent: done\ndata: {}\n\n',
    ),
    (event) => events.push(event),
  );
  assert.equal(events[0].data.text, "Tài liệu tiếng Việt");
  assert.equal(events.at(-1).event, "done");
});
test("SSE rejects premature EOF and provider error instead of presenting success", async () => {
  await assert.rejects(
    readAnswer(
      stream('event: delta\ndata: {"text":"unfinished"}\n\n'),
      () => {},
    ),
  );
  await assert.rejects(
    readAnswer(stream('event: error\ndata: {"message":"quota"}\n\n'), () => {}),
    /quota/,
  );
  assert.equal(parseEvent(": heartbeat"), null);
});
test("SSE handles CRLF and ignores keepalive frames", async () => {
  const events = [];
  await readAnswer(
    stream(": heartbeat\r\n\r\nevent: done\r\ndata: {}\r\n\r\n", 4),
    (event) => events.push(event),
  );
  assert.equal(events.length, 1);
});
