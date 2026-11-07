import { attachSocketRecovery } from "@/lib/authenticated-socket";
import { SOCKET_RETRY } from "@/lib/socket-session.constants";
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
  private disposeRecovery?: () => void;

  connect(token: string): ChatSocket {
    if (this.socket) return this.socket;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api$/, "");
    this.socket = io(baseUrl, {
      path: "/communication.io",
      transports: ["websocket"],
      autoConnect: false,
      reconnection: false,
      timeout: SOCKET_RETRY.timeoutMs,
      auth: { token },
    }) as ChatSocket;
    this.disposeRecovery = attachSocketRecovery(this.socket, token, "chat");
    return this.socket;
  }

  disconnect() {
    this.disposeRecovery?.();
    this.disposeRecovery = undefined;
    this.socket = null;
  }

  getSocket(): ChatSocket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
