import { io, Socket } from "socket.io-client";

class NotificationSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (!this.socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const baseUrl = apiUrl.replace(/\/api$/, "");

      this.socket = io(baseUrl, {
        path: "/notification.io",
        auth: {
          token,
        },
      });

      this.socket.on("connect", () => {});

      this.socket.on("disconnect", () => {});
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
