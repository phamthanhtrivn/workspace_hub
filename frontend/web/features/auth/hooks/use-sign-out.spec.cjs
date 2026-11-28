/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");

function fixture() {
  const calls = [],
    requests = [];
  const load = createSourceLoader(path.resolve(__dirname, "../../.."));
  const { useSignOut } = load("features/auth/hooks/use-sign-out.ts", {
    react: { useRef: (value) => ({ current: value }) },
    "next/navigation": {
      useRouter: () => ({ push: (href) => calls.push(["navigate", href]) }),
    },
    "@tanstack/react-query": {
      useIsMutating: () => 0,
      useQueryClient: () => ({ clear: () => calls.push(["cache"]) }),
    },
    sonner: {
      toast: {
        success: (message) => calls.push(["success", message]),
        error: (message) => calls.push(["error", message]),
      },
    },
    "@/store/store": {
      useAppSelector: (select) => select({ auth: { userId: "account-a" } }),
      useAppDispatch: () => (action) => calls.push(["auth", action]),
    },
    "@/store/auth/auth-slice": {
      clearCredentials: () => ({ type: "auth/clearCredentials" }),
    },
    "@/features/pomodoro/utils/pomodoro-local-storage": {
      clearLocalPomodoroData: (id) => calls.push(["pomodoro", id]),
    },
    "@/features/chat/api/chat-socket.service": {
      socketService: { disconnect: () => calls.push(["chat"]) },
    },
    "@/features/notification/api/notification-socket.service": {
      notificationSocketService: {
        disconnect: () => calls.push(["notifications"]),
      },
    },
    "../utils/auth-error": { getAuthErrorMessage: (_, fallback) => fallback },
    "./useAuthMutations": {
      useLogoutMutation: () => ({
        isPending: false,
        mutate: (_, callbacks) => requests.push(callbacks),
      }),
    },
  });

  return { ...useSignOut(), calls, requests };
}

test("shared sign-out prevents duplicate submissions and clears account state after success", () => {
  const f = fixture();
  f.signOut();
  f.signOut();
  assert.equal(f.requests.length, 1);
  f.requests[0].onSuccess();
  f.requests[0].onSettled();
  assert.deepEqual(
    f.calls.map(([kind]) => kind),
    [
      "success",
      "pomodoro",
      "notifications",
      "chat",
      "auth",
      "cache",
      "navigate",
    ],
  );
  assert.deepEqual(f.calls.at(-1), ["navigate", "/login"]);
  assert.deepEqual(f.calls[1], ["pomodoro", "account-a"]);
});

test("API failure preserves existing local sign-out behavior and reports the failure", () => {
  const f = fixture();
  f.signOut();
  f.requests[0].onError(new Error("Unavailable"));
  f.requests[0].onSettled();
  assert.deepEqual(f.calls[0], ["error", "Sign out failed"]);
  assert.ok(f.calls.some(([kind]) => kind === "auth"));
  assert.ok(f.calls.some(([kind]) => kind === "cache"));
  assert.deepEqual(f.calls.at(-1), ["navigate", "/login"]);
});
