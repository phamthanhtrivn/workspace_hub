import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { getExpectedApiConflictMessage, isRecoverableApiError } from "./api-error-policy";

const message = "Task status cannot move backwards";
function conflict({ status = 409, method = "patch", data = { message }, expected = [message] }: {
  status?: number; method?: string; data?: unknown; expected?: readonly string[];
} = {}) {
  const config: InternalAxiosRequestConfig = { method, url: "/api/tasks/task", headers: new AxiosHeaders(), expectedConflictMessages: expected };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, { status, data, config, statusText: "Conflict", headers: {} });
}

test("only opted-in, known mutation conflicts qualify for toast-only handling", () => {
  assert.equal(getExpectedApiConflictMessage(conflict()), message);
  assert.equal(getExpectedApiConflictMessage(conflict({ data: message })), message);
  const notOptedIn = conflict();
  delete notOptedIn.config!.expectedConflictMessages;
  for (const error of [
    notOptedIn,
    conflict({ expected: [] }),
    conflict({ status: 500 }),
    conflict({ status: 403 }),
    conflict({ method: "get" }),
    conflict({ data: { message: "Unexpected conflict" } }),
    conflict({ data: { message: [message] } }),
    new Error(message),
    new AxiosError("Network Error", "ERR_NETWORK"),
  ]) {
    assert.equal(getExpectedApiConflictMessage(error), undefined);
  }
});

test("background retry classification remains independent of business conflicts", () => {
  assert.equal(isRecoverableApiError(conflict()), false);
  assert.equal(isRecoverableApiError(conflict({ status: 503 })), true);
  assert.equal(isRecoverableApiError(new AxiosError("Network Error", "ERR_NETWORK")), true);
});
