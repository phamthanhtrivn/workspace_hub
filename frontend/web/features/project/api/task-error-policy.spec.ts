import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { api } from "@/lib/axios";
import { logApiError } from "@/lib/interceptors";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { updateTask } from "./task.api";
import { TASK_EXPECTED_CONFLICT_MESSAGES, taskActionRequest } from "./task-error-policy";
import { TaskStatus } from "../types/project";

test("task PATCH business conflict stays rejected for the toast without console errors or retry", async (context) => {
  const errors = context.mock.method(console, "error", () => {});
  const warnings = context.mock.method(console, "warn", () => {});
  const originalAdapter = api.defaults.adapter;
  context.after(() => { api.defaults.adapter = originalAdapter; });
  let requestCount = 0;
  const message = "Task status cannot move backwards";

  api.defaults.adapter = async (config) => {
    requestCount++;
    assert.equal(config.method, "patch");
    assert.deepEqual(JSON.parse(config.data), { status: TaskStatus.TODO });
    assert.ok(config.expectedConflictMessages?.includes(message));
    throw new AxiosError("Conflict", "ERR_BAD_REQUEST", config, undefined, {
      status: 409, statusText: "Conflict", config, headers: {}, data: { message },
    });
  };
  await assert.rejects(updateTask("status-policy-test", { status: TaskStatus.TODO }), (error: unknown) => {
    assert.equal(getActionErrorMessage(error, "Failed to update task"), message);
    return true;
  });
  assert.equal(requestCount, 1);
  assert.equal(errors.mock.callCount(), 0);
  assert.equal(warnings.mock.callCount(), 0);
});

test("every declared task business message is toast-only, while unexpected failures retain diagnostics", (context) => {
  const errors = context.mock.method(console, "error", () => {});
  const config: InternalAxiosRequestConfig = {
    ...taskActionRequest(), method: "patch", url: "/api/tasks/log-policy-test", headers: new AxiosHeaders(),
  };
  const fail = (status: number, message: string) => {
    const error = new AxiosError("Request failed");
    error.config = config;
    error.response = { status, data: { message }, config, statusText: "Failed", headers: {} };
    return error;
  };
  assert.equal(new Set(TASK_EXPECTED_CONFLICT_MESSAGES).size, TASK_EXPECTED_CONFLICT_MESSAGES.length);
  for (const message of TASK_EXPECTED_CONFLICT_MESSAGES) {
    const error = fail(409, message);
    logApiError(error);
    assert.equal(getActionErrorMessage(error, "Fallback"), message);
  }
  assert.equal(errors.mock.callCount(), 0);
  logApiError(fail(409, "An unexpected task conflict"));
  logApiError(fail(500, "Task status cannot move backwards"));
  logApiError(new AxiosError("Network Error", "ERR_NETWORK", config));
  assert.equal(errors.mock.callCount(), 3);
});
