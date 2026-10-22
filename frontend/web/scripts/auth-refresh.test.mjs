import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import axios from "axios";
import ts from "typescript";

const source = readFileSync(new URL("../lib/interceptors.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture({ adapter, refresh } = {}) {
  let auth = { accessToken: "expired-token", userId: "demo" };
  const redirects = [];
  const logs = [];
  const logoutUrls = [];
  let refreshCalls = 0;
  const attempts = [];
  const api = axios.create({
    baseURL: "http://localhost:8000",
    adapter: async (config) => {
      attempts.push({ url: config.url, token: config.headers.Authorization });
      if (adapter) await adapter(config);
      else if (config.headers.Authorization === "Bearer expired-token") unauthorized(config);
      return { status: 200, data: { success: true }, headers: {}, config };
    },
  });
  const dependencies = {
    axios: { default: { isCancel: axios.isCancel, isAxiosError: axios.isAxiosError,
      post: async (url) => { logoutUrls.push(url); } } },
    "./axios": { api },
    "@/store/store": { store: {
      getState: () => ({ auth }),
      dispatch: (action) => { auth = action.type === "clear" ? { accessToken: null } : action.payload; },
    } },
    "@/store/auth/auth-slice": {
      setCredentials: (payload) => ({ type: "set", payload }),
      clearCredentials: () => ({ type: "clear" }),
    },
    "@/features/auth/api/auth.api": { refreshApi: async () => {
      refreshCalls += 1;
      if (refresh) await refresh();
      return { data: { accessToken: "fresh-token", userId: "demo", email: "demo@example.test", role: "USER" } };
    } },
    "@/features/auth/utils/auth-redirect": { getLoginRedirectPath: () => "/login?returnTo=%2Fai" },
  };
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: compiled.exports, module: compiled,
    require: (name) => {
      assert.ok(dependencies[name], "Unexpected import " + name);
      return dependencies[name];
    },
    console: { error: (...args) => logs.push(args) },
    window: { location: { pathname: "/ai", search: "", assign: (url) => redirects.push(url) } },
    process: { env: {} },
  });
  return { api, attempts, redirects, logs, logoutUrls,
    get auth() { return auth; }, get refreshCalls() { return refreshCalls; } };
}

function unauthorized(config) {
  throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null,
    { status: 401, data: { message: "A valid access token is required" }, headers: {}, config });
}

test("concurrent expired requests share one refresh and all recover", async () => {
  const gate = deferred();
  const f = fixture({ refresh: () => gate.promise });
  const requests = ["documents", "summaries", "conversations"].map((path) => f.api.get("/api/test/" + path));
  await new Promise(setImmediate);
  assert.equal(f.refreshCalls, 1);
  gate.resolve();
  const results = await Promise.all(requests);
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(f.refreshCalls, 1);
  assert.equal(f.logs.length, 0);
});

test("a delayed 401 for the previous token reuses the refreshed token", async () => {
  const gate = deferred();
  const f = fixture({ adapter: async (config) => {
    if (config.headers.Authorization === "Bearer expired-token") {
      if (config.url.endsWith("summaries")) await gate.promise;
      unauthorized(config);
    }
  } });
  const delayed = f.api.get("/api/test/summaries");
  await f.api.get("/api/test/documents");
  gate.resolve();
  await delayed;
  assert.equal(f.refreshCalls, 1);
  assert.equal(f.logs.length, 0);
});

test("a refreshed token rejected by the API ends the session without a retry loop", async () => {
  const gate = deferred();
  const f = fixture({ adapter: unauthorized, refresh: () => gate.promise });
  const requests = Promise.allSettled([f.api.get("/api/test/documents"), f.api.get("/api/test/summaries")]);
  await new Promise(setImmediate);
  gate.resolve();
  const results = await requests;
  assert.ok(results.every((r) => r.status === "rejected"));
  assert.equal(f.refreshCalls, 1);
  assert.equal(f.auth.accessToken, null);
  assert.ok(f.redirects.includes("/login?returnTo=%2Fai"));
  assert.ok(f.logoutUrls.includes("http://localhost:8000/api/auth/logout"));
  assert.equal(f.logs.length, 0);
});

test("failed refresh clears the session and uses the configured gateway for logout", async () => {
  const f = fixture({ refresh: async () => { throw new Error("Refresh expired"); } });
  await assert.rejects(f.api.get("/api/test/summaries"));
  assert.equal(f.auth.accessToken, null);
  assert.deepEqual(f.logoutUrls, ["http://localhost:8000/api/auth/logout"]);
  assert.ok(f.redirects.length > 0);
});

test("non-authentication API errors remain visible in diagnostics", async () => {
  const f = fixture({ adapter: (config) => {
    throw new axios.AxiosError("Unavailable", "ERR_BAD_RESPONSE", config, null,
      { status: 503, data: { message: "Service unavailable" }, headers: {}, config });
  } });
  await assert.rejects(f.api.get("/api/test/summaries"));
  assert.equal(f.logs.length, 1);
  assert.equal(f.refreshCalls, 0);
});
