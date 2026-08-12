import { io, Socket } from "socket.io-client";
import {
  ClientToServerChatEvents,
  ServerToClientChatEvents,
} from "../types/chat-socket.types";

export type ChatSocket = Socket<
  ServerToClientChatEvents,
  ClientToServerChatEvents
>;

class SocketService {
  private socket: ChatSocket | null = null;

  connect(token: string): ChatSocket {
    if (!this.socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const baseUrl = apiUrl.replace(/\/api$/, "");

      this.socket = io(baseUrl, {
        path: "/communication.io",
        auth: {
          token,
        },
      }) as ChatSocket;

      this.socket.on("connect", () => {});

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

  getSocket(): ChatSocket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
