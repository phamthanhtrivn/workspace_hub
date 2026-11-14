import { test } from "node:test";
import assert from "node:assert/strict";
import { AxiosError, type AxiosResponse } from "axios";
import { getPushSetupDiagnostic } from "./push-setup-diagnostic";

test("push setup reports the backend reason and endpoint host without leaking subscription credentials", () => {
  const error = new AxiosError(
    "Request failed with status code 400",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status: 400,
      data: { message: "Push endpoint is not allowed" },
    } as AxiosResponse,
  );
  const result = getPushSetupDiagnostic(
    error,
    "save-subscription",
    "https://example.notify.windows.com/private-subscription-token",
  );
  assert.equal(result.reason, "Push endpoint is not allowed");
  assert.equal(result.endpointHost, "example.notify.windows.com");
  assert.equal(result.status, 400);
  assert.match(result.hint ?? "", /WEB_PUSH_ALLOWED_HOSTS/);
  assert.equal(
    JSON.stringify(result).includes("private-subscription-token"),
    false,
  );
});
test("DTO failures include field validation messages; non-HTTP failures identify the browser setup step", () => {
  const error = new AxiosError(
    "Request failed with status code 400",
    undefined,
    undefined,
    undefined,
    {
      status: 400,
      data: {
        message: "Validation failed",
        errors: { keys: "keys.auth must match the expected format" },
      },
    } as AxiosResponse,
  );
  assert.match(
    getPushSetupDiagnostic(error, "save-subscription").reason,
    /keys.auth/,
  );
  assert.equal(
    getPushSetupDiagnostic(new Error("Permission blocked"), "permission")
      .reason,
    "Permission blocked",
  );
});
