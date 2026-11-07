import type { Socket } from "socket.io-client";
import {
  readSocketAuthCode,
  SESSION_ERROR_EVENT,
  SOCKET_AUTH_CODE,
  SOCKET_RETRY,
  type SocketAuthCode,
} from "./socket-session.constants";

interface RecoveryDependencies {
  refresh: (token: string) => Promise<string | null>;
  terminate: (token: string) => Promise<void>;
  isOnline: () => boolean;
  schedule: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  cancel: (timer: ReturnType<typeof setTimeout>) => void;
  random: () => number;
  warn: (code: string) => void;
}

/** Owns reconnection; Socket.IO's separate reconnect loop must be disabled. */
export class SocketRecovery {
  private token: string;
  private timer?: ReturnType<typeof setTimeout>;
  private attempt = 0;
  private generation = 0;
  private stopped = false;
  private disposed = false;
  private refreshing = false;
  private refreshedToken?: string;

  constructor(
    private socket: Socket,
    token: string,
    private dependencies: RecoveryDependencies,
  ) {
    this.token = token;
    socket.on("connect", this.onConnect);
    socket.on("connect_error", this.onError);
    socket.on("disconnect", this.onDisconnect);
    socket.on(SESSION_ERROR_EVENT, this.onError);
  }

  start() {
    this.connect();
  }

  updateToken(token: string) {
    if (this.disposed || token === this.token) return;
    this.generation++;
    this.token = token;
    this.stopped = false;
    this.refreshing = false;
    this.attempt = 0;
    this.refreshedToken = undefined;
    this.clearTimer();
    this.socket.disconnect();
    this.connect();
  }

  online = () => {
    this.clearTimer();
    if (!this.socket.connected && !this.refreshing) this.connect();
  };

  offline = () => {
    this.clearTimer();
  };

  dispose() {
    this.disposed = true;
    this.generation++;
    this.clearTimer();
    this.socket.off("connect", this.onConnect);
    this.socket.off("connect_error", this.onError);
    this.socket.off("disconnect", this.onDisconnect);
    this.socket.off(SESSION_ERROR_EVENT, this.onError);
    this.socket.disconnect();
    this.socket.sendBuffer.length = 0;
  }

  private clearTimer() {
    if (this.timer !== undefined) this.dependencies.cancel(this.timer);
    this.timer = undefined;
  }

  private connect() {
    if (this.disposed || this.stopped || !this.dependencies.isOnline()) return;
    this.socket.auth = { token: this.token };
    // Reconcile reads/rooms on connect; never replay buffered mutations.
    this.socket.sendBuffer.length = 0;
    this.socket.connect();
  }

  private retry() {
    if (
      this.disposed ||
      this.stopped ||
      this.refreshing ||
      this.timer !== undefined ||
      !this.dependencies.isOnline()
    )
      return;
    const base = Math.min(
      SOCKET_RETRY.initialDelayMs * 2 ** Math.min(this.attempt++, 5),
      SOCKET_RETRY.maxDelayMs,
    );
    const delay = Math.min(
      base * (1 + this.dependencies.random() * 0.2),
      SOCKET_RETRY.maxDelayMs,
    );
    this.timer = this.dependencies.schedule(() => {
      this.timer = undefined;
      this.connect();
    }, delay);
  }

  private onConnect = () => {
    this.attempt = 0;
    this.clearTimer();
  };

  private onDisconnect = (reason: string) => {
    this.socket.sendBuffer.length = 0;
    if (reason !== "io client disconnect") this.retry();
  };

  private onError = (error: unknown) => {
    const code = readSocketAuthCode(error);
    this.dependencies.warn(code ?? "CONNECTION_UNAVAILABLE");
    void this.handleFailure(code);
  };

  private async handleFailure(code?: SocketAuthCode) {
    if (this.disposed || this.stopped) return;
    this.clearTimer();
    this.socket.disconnect();
    if (code === SOCKET_AUTH_CODE.SESSION_REVOKED) {
      this.stopped = true;
      await this.dependencies.terminate(this.token);
      return;
    }
    if (
      code === SOCKET_AUTH_CODE.TOKEN_INVALID ||
      code === SOCKET_AUTH_CODE.AUTH_CONFIGURATION_ERROR
    ) {
      this.stopped = true;
      return;
    }
    if (code !== SOCKET_AUTH_CODE.TOKEN_EXPIRED) {
      this.retry();
      return;
    }
    if (this.refreshing || this.stopped) return;
    if (this.refreshedToken === this.token) {
      this.stopped = true;
      return;
    }
    const generation = this.generation;
    const failedToken = this.token;
    this.refreshing = true;
    try {
      const token = await this.dependencies.refresh(failedToken);
      if (this.disposed || generation !== this.generation) return;
      this.refreshing = false;
      if (!token) {
        this.stopped = true;
        return;
      }
      this.refreshedToken = failedToken;
      if (token !== failedToken) this.updateToken(token);
      else this.stopped = true;
    } catch {
      if (this.disposed || generation !== this.generation) return;
      this.refreshing = false;
      // Retry the handshake to classify the current backend/session state again.
      this.retry();
    }
  }
}
