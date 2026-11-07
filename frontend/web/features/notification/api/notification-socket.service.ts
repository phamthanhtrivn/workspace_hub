import { io, Socket } from "socket.io-client";
import { attachSocketRecovery } from "@/lib/authenticated-socket";
import { SOCKET_RETRY } from "@/lib/socket-session.constants";

class NotificationSocketService {
  private socket: Socket | null = null;
  private disposeRecovery?: () => void;

  connect(token: string): Socket {
    if (this.socket) return this.socket;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api$/, "");
    this.socket = io(baseUrl, {
      path: "/notification.io",
      transports: ["websocket"],
      autoConnect: false,
      reconnection: false,
      timeout: SOCKET_RETRY.timeoutMs,
      auth: { token },
    });
    this.disposeRecovery = attachSocketRecovery(
      this.socket,
      token,
      "notification",
    );
    return this.socket;
  }

  disconnect() {
    this.disposeRecovery?.();
    this.disposeRecovery = undefined;
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const notificationSocketService = new NotificationSocketService();
