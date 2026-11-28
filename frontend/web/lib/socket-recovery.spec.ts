import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import type { Socket } from "socket.io-client";
import { SocketRecovery } from "./socket-recovery";
import {
  SESSION_ERROR_EVENT,
  SOCKET_AUTH_CODE,
} from "./socket-session.constants";

class TestSocket extends EventEmitter {
  connected = false;
  auth: unknown;
  sendBuffer: unknown[] = [];
  connections = 0;
  connect() {
    this.connections++;
    return this;
  }
  disconnect() {
    if (this.connected) {
      this.connected = false;
      this.emit("disconnect", "io client disconnect");
    }
    return this;
  }
}

function fixture(
  refresh: (token: string) => Promise<string | null> = async () => "new",
) {
  const socket = new TestSocket();
  const timers = new Map<number, () => void>();
  const delays: number[] = [];
  let online = true;
  let terminations = 0;
  let sequence = 0;
  const recovery = new SocketRecovery(socket as unknown as Socket, "old", {
    refresh,
    terminate: async () => {
      terminations++;
    },
    isOnline: () => online,
    schedule: (callback, delay) => {
      delays.push(delay);
      timers.set(++sequence, callback);
      return sequence as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: (timer) => {
      timers.delete(timer as unknown as number);
    },
    random: () => 0,
    warn: () => {},
  });
  const tick = () => {
    const first = timers.entries().next().value;
    if (first) {
      timers.delete(first[0]);
      first[1]();
    }
  };
  return {
    socket,
    recovery,
    timers,
    delays,
    tick,
    setOnline: (next: boolean) => {
      online = next;
    },
    get terminations() {
      return terminations;
    },
  };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("transient/legacy errors back off to 30 seconds and never terminate the session", () => {
  const f = fixture();
  f.recovery.start();
  for (let i = 0; i < 7; i++) {
    f.socket.emit(
      "connect_error",
      new Error("A valid active session is required"),
    );
    assert.equal(f.timers.size, 1);
    f.socket.sendBuffer.push({ mutation: true });
    f.tick();
    assert.equal(f.socket.sendBuffer.length, 0);
  }
  assert.deepEqual(f.delays, [1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  assert.equal(f.terminations, 0);
  f.recovery.dispose();
});

test("invalid token/configuration stop until credentials change", () => {
  for (const code of [
    SOCKET_AUTH_CODE.TOKEN_INVALID,
    SOCKET_AUTH_CODE.AUTH_CONFIGURATION_ERROR,
  ]) {
    const f = fixture();
    f.recovery.start();
    f.socket.emit("connect_error", { data: { code } });
    f.recovery.online();
    assert.equal(f.socket.connections, 1);
    assert.equal(f.timers.size, 0);
    assert.equal(f.terminations, 0);
    f.recovery.updateToken("new");
    assert.equal(f.socket.connections, 2);
    f.recovery.dispose();
  }
});

test("expired token refreshes and reconnects with new auth without duplicate listeners", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    return "new";
  });
  f.socket.emit(SESSION_ERROR_EVENT, { code: SOCKET_AUTH_CODE.TOKEN_EXPIRED });
  f.socket.emit("disconnect", "io server disconnect");
  await flush();
  assert.equal(calls, 1);
  assert.deepEqual(f.socket.auth, { token: "new" });
  assert.equal(f.socket.listenerCount("connect"), 1);
  assert.equal(f.timers.size, 0);
  f.recovery.dispose();
  assert.equal(f.socket.listenerCount(SESSION_ERROR_EVENT), 0);
});

test("revocation terminates; disposal cancels pending refresh and retries", async () => {
  const revoked = fixture();
  revoked.socket.emit(SESSION_ERROR_EVENT, {
    code: SOCKET_AUTH_CODE.SESSION_REVOKED,
  });
  await flush();
  assert.equal(revoked.terminations, 1);
  assert.equal(revoked.timers.size, 0);
  revoked.recovery.dispose();
  let done!: (token: string) => void;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  );
  f.socket.emit(SESSION_ERROR_EVENT, { code: SOCKET_AUTH_CODE.TOKEN_EXPIRED });
  f.recovery.dispose();
  done("stale");
  await flush();
  assert.equal(f.socket.connections, 0);
  assert.equal(f.timers.size, 0);
});

test("offline pauses retries and server disconnect reconnects on return online", () => {
  const f = fixture();
  f.socket.emit("disconnect", "io server disconnect");
  assert.equal(f.timers.size, 1);
  f.setOnline(false);
  f.recovery.offline();
  f.socket.emit("connect_error", {
    data: { code: SOCKET_AUTH_CODE.AUTH_SERVICE_UNAVAILABLE },
  });
  assert.equal(f.timers.size, 0);
  f.setOnline(true);
  f.recovery.online();
  assert.equal(f.socket.connections, 1);
  f.recovery.dispose();
});

test("a temporary refresh outage retries without terminating and recovers later", async () => {
  let calls = 0;
  const f = fixture(async () => {
    if (++calls === 1) throw new Error("Service unavailable");
    return "new";
  });
  f.socket.emit(SESSION_ERROR_EVENT, { code: SOCKET_AUTH_CODE.TOKEN_EXPIRED });
  await flush();
  assert.equal(f.timers.size, 1);
  assert.equal(f.terminations, 0);
  f.tick();
  f.socket.emit("connect_error", {
    data: { code: SOCKET_AUTH_CODE.TOKEN_EXPIRED },
  });
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(f.socket.auth, { token: "new" });
  assert.equal(f.timers.size, 0);
  f.recovery.dispose();
});
