import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (!this.socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const baseUrl = apiUrl.replace(/\/api$/, "");

      this.socket = io(baseUrl, {
        auth: {
          token,
        },
      });

      this.socket.on("connect", () => {
        console.log("Connected to Chat Socket");
      });

      this.socket.on("disconnect", () => {
        console.log("Disconnected from Chat Socket");
      });
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

export const socketService = new SocketService();
