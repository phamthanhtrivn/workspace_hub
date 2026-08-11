import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (!this.socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const baseUrl = apiUrl.replace(/\/api$/, "");

      this.socket = io(baseUrl, {
        path: "/communication.io",
        transports: ["websocket"],
        auth: {
          token,
        },
      });

      this.socket.on("connect", () => {});

      this.socket.on("disconnect", () => {});
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
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

export const socketService = new SocketService();
