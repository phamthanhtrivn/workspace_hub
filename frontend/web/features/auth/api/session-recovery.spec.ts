import assert from "node:assert/strict";
import { test } from "node:test";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { api } from "@/lib/axios";
import "@/lib/interceptors";
import { store } from "@/store/store";
import { clearCredentials, setCredentials } from "@/store/auth/auth-slice";
import { USER_ROLES } from "../types/auth.constants";
import {
  endSession,
  getSessionEpoch,
  sessionRecovery,
} from "./session-recovery";
import { withSessionLock } from "./session-lock";

const credentials = (accessToken: string, userId = "a") => ({
  accessToken,
  userId,
  email: "test@example.invalid",
  role: USER_ROLES.USER,
});
const response = (
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
) => ({ config, status, statusText: String(status), data, headers: {} });
const failure = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError(
    "Test request failed",
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    response(config, status, {}),
  );

test("real HTTP interceptor and three socket callers share refresh and the new credentials", async () => {
  const adapter = api.defaults.adapter;
  store.dispatch(setCredentials(credentials("old")));
  let refreshes = 0;
  let complete!: () => void;
  const waiting = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let markHttpFailure!: () => void;
  const httpFailure = new Promise<void>((resolve) => {
    markHttpFailure = resolve;
  });
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/auth/refresh") {
      refreshes++;
      await waiting;
      return response(config, 200, { data: credentials("new") });
    }
    if (config.headers.Authorization === "Bearer old") {
      markHttpFailure();
      throw failure(config, 401);
    }
    return response(config, 200, { ok: true });
  };
  try {
    const http = api.get("/test/protected");
    await httpFailure;
    const sockets = Array.from({ length: 3 }, () =>
      sessionRecovery.refreshForToken("old"),
    );
    complete();
    assert.equal((await http).status, 200);
    assert.deepEqual(await Promise.all(sockets), ["new", "new", "new"]);
    assert.equal(refreshes, 1);
    assert.equal(store.getState().auth.accessToken, "new");
  } finally {
    api.defaults.adapter = adapter;
    store.dispatch(clearCredentials());
  }
});

test("HTTP refresh outage preserves credentials and late 401 cannot replay across accounts", async () => {
  const adapter = api.defaults.adapter;
  store.dispatch(setCredentials(credentials("old")));
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests++;
    if (config.url !== "/api/auth/refresh")
      assert.equal(config.sessionEpoch, getSessionEpoch());
    throw failure(config, config.url === "/api/auth/refresh" ? 503 : 401);
  };
  try {
    await assert.rejects(api.get("/test/protected"), (error: unknown) => {
      if (!(error instanceof AxiosError)) throw error;
      assert.equal(error.response?.status, 503);
      return true;
    });
    assert.equal(store.getState().auth.accessToken, "old");
    assert.equal(requests, 2);
    let rejectRequest!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    api.defaults.adapter = (config) =>
      new Promise((_resolve, reject) => {
        markStarted();
        rejectRequest = () => reject(failure(config, 401));
      });
    const late = api.get("/test/old-account");
    await started;
    store.dispatch(clearCredentials());
    store.dispatch(setCredentials(credentials("b-token", "b")));
    rejectRequest();
    await assert.rejects(late);
    assert.equal(store.getState().auth.accessToken, "b-token");
  } finally {
    api.defaults.adapter = adapter;
    store.dispatch(clearCredentials());
  }
});

test("session termination is serialized and cannot delete a newer login cookie", async () => {
  const adapter = axios.defaults.adapter;
  let logouts = 0;
  axios.defaults.adapter = async (config) => {
    logouts++;
    return response(config, 200, {});
  };
  try {
    store.dispatch(setCredentials(credentials("old")));
    const snapshot = store.getState().auth;
    await Promise.all([endSession(snapshot), endSession(snapshot)]);
    assert.equal(logouts, 1);
    assert.equal(store.getState().auth.accessToken, null);

    let unlock!: () => void;
    const blocked = withSessionLock(
      () =>
        new Promise<void>((resolve) => {
          unlock = resolve;
        }),
    );
    await Promise.resolve();
    store.dispatch(setCredentials(credentials("old")));
    const obsolete = endSession(store.getState().auth);
    store.dispatch(setCredentials(credentials("new-login", "b")));
    unlock();
    await blocked;
    await obsolete;
    assert.equal(logouts, 1);
    assert.equal(store.getState().auth.accessToken, "new-login");
  } finally {
    axios.defaults.adapter = adapter;
    store.dispatch(clearCredentials());
  }
});
