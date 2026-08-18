import { io, Socket } from "socket.io-client";

const SOCKET_ERROR_LOG_THROTTLE_MS = 10_000;

class NotificationSocketService {
  private socket: Socket | null = null;
  private lastErrorLoggedAt = 0;

  connect(token: string) {
    if (!this.socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const baseUrl = apiUrl.replace(/\/api$/, "");

      this.socket = io(baseUrl, {
        path: "/notification.io",
        reconnectionAttempts: 3,
        timeout: 5_000,
        auth: {
          token,
        },
      });

      this.socket.on("connect", () => {});
      this.socket.on("connect_error", (error) => {
        const now = Date.now();
        if (now - this.lastErrorLoggedAt < SOCKET_ERROR_LOG_THROTTLE_MS) {
          return;
        }
        this.lastErrorLoggedAt = now;
        console.warn(`Notification socket unavailable: ${error.message}`);
      });

    }

    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const notificationSocketService = new NotificationSocketService();
