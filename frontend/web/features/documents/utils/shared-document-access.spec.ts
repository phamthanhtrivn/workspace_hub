import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import { api } from "@/lib/axios";
import { getExpectedApiBusinessMessage } from "@/lib/api-error-policy";
import { logApiError } from "@/lib/interceptors";
import { logActionError } from "@/lib/permission-feedback";
import { documentsApi } from "../api/documents.api";
import { SHARED_DOCUMENT_ACCESS_FAILURES } from "../types/shared-document-access.constants";
import {
  getSharedDocumentAccessCode,
  SHARED_DOCUMENT_ACCESS_REQUEST,
} from "./shared-document-access";

function failure(status: number, data: unknown, optedIn = true) {
  const config: InternalAxiosRequestConfig = {
    method: "get",
    url: optedIn ? "/api/documents/public/file" : "/api/documents/file",
    headers: new AxiosHeaders(),
    ...(optedIn ? SHARED_DOCUMENT_ACCESS_REQUEST : {}),
  };

  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    { status, data, config, headers: {}, statusText: "Access unavailable" },
  );
}

test("shared document responses distinguish access states and support existing message envelopes", () => {
  for (const expected of SHARED_DOCUMENT_ACCESS_FAILURES) {
    assert.equal(
      getSharedDocumentAccessCode(
        failure(expected.status, {
          code: expected.code,
          message: expected.messages[0],
        }),
      ),
      expected.code,
    );
    assert.equal(
      getSharedDocumentAccessCode(
        failure(expected.status, { message: expected.messages[0] }),
      ),
      expected.code,
    );
  }
  for (const error of [
    failure(500, { code: "DOCUMENT_ACCESS_RESTRICTED" }),
    failure(403, { message: "Invalid CSRF token" }),
    failure(401, { message: "Sign in" }),
    new AxiosError("Offline", "ERR_NETWORK"),
    new Error("Offline"),
  ]) {
    assert.equal(getSharedDocumentAccessCode(error), undefined);
  }
});

test("expected shared-access states produce no application console logs", (context) => {
  const errors = context.mock.method(console, "error", () => {});
  const warnings = context.mock.method(console, "warn", () => {});
  for (const expected of SHARED_DOCUMENT_ACCESS_FAILURES) {
    const error = failure(expected.status, {
      code: expected.code,
      message: expected.messages[0],
    });
    logApiError(error, "shared-access test");
    logActionError("Shared document", error);
  }
  assert.equal(errors.mock.callCount(), 0);
  assert.equal(warnings.mock.callCount(), 0);
});

test("network, server and unrelated permission failures keep their logs", (context) => {
  const errors = context.mock.method(console, "error", () => {});
  const warnings = context.mock.method(console, "warn", () => {});
  for (const [index, error] of [
    failure(500, { message: "Unavailable" }),
    failure(403, { message: "Invalid CSRF token" }),
    failure(
      403,
      {
        code: "DOCUMENT_ACCESS_RESTRICTED",
        message: "You are not allowed to access this item",
      },
      false,
    ),
    new AxiosError("Offline", "ERR_NETWORK"),
  ].entries()) {
    assert.equal(getExpectedApiBusinessMessage(error), undefined);
    logApiError(error, `unexpected shared-access test ${index}`);
  }
  assert.equal(errors.mock.callCount() + warnings.mock.callCount(), 4);
});

test("public document reads opt in to expected access responses at the API boundary", async (context) => {
  const adapter = api.defaults.adapter;
  context.after(() => {
    api.defaults.adapter = adapter;
  });
  const errors = context.mock.method(console, "error", () => {});
  const warnings = context.mock.method(console, "warn", () => {});
  api.defaults.adapter = async (config) => {
    throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, {
      config,
      status: 403,
      data: {
        code: "DOCUMENT_ACCESS_RESTRICTED",
        message: "You are not allowed to access this item",
      },
      headers: {},
      statusText: "Forbidden",
    });
  };
  for (const request of [
    () => documentsApi.getPublicDocument("file"),
    () => documentsApi.getPublicPreviewUrl("file"),
    () => documentsApi.getPublicDownloadUrl("file"),
    () => documentsApi.getPublicVersions("file"),
    () => documentsApi.getPublicFolderChildren("folder", "folder"),
  ]) {
    await assert.rejects(request, (error: unknown) => {
      assert.ok(getExpectedApiBusinessMessage(error));

      return true;
    });
  }
  assert.equal(errors.mock.callCount(), 0);
  assert.equal(warnings.mock.callCount(), 0);
});
