import assert from "node:assert/strict";
import test from "node:test";
import { isTaskCardMessage } from "./task-card-message";

test("recognizes task payloads stored as TEXT when opening a thread directly", () => {
  assert.equal(isTaskCardMessage({
    type: "TEXT",
    content: JSON.stringify({ type: "TASK", taskId: "68a94ab7", title: "Review permissions" }),
  }), true);
});

test("recognizes task JSON independently of field order and whitespace", () => {
  for (const content of [
    '{ "title": "Review", "taskId": "68a94ab7" }',
    '\n{ "projectId": "project", "type": "TASK", "title": "Review" }\n',
  ]) {
    assert.equal(isTaskCardMessage({ type: "TEXT", content }), true);
  }
});

test("preserves explicit task messages and legacy task tags", () => {
  assert.equal(isTaskCardMessage({ type: "TASK", content: "Old discussion" }), true);
  assert.equal(isTaskCardMessage({ type: "TEXT", content: "Discussion Thread: Old task [Task #64d444da]" }), true);
});

test("leaves normal text, unrelated JSON, and malformed payloads as messages", () => {
  for (const content of [null, "", "Ordinary message", '{"title":"A note"}', '{"taskId":null}', '{"taskId":123}', '{"type":"TASK"', "null", "[]"]) {
    assert.equal(isTaskCardMessage({ type: "TEXT", content }), false);
  }
});
