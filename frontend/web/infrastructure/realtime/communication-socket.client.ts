import { io } from "socket.io-client";
import type { CommunicationSocket } from "./communication-socket.types";

class CommunicationSocketClient {
  private socket: CommunicationSocket | null = null;
  private currentToken: string | null = null;

  connect(token: string): CommunicationSocket {
    if (this.socket && this.currentToken === token) {
      if (!this.socket.connected && !this.socket.active) {
        this.socket.connect();
      }
      return this.socket;
    }

    if (this.socket) {
      this.disconnect();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
    const baseUrl = apiUrl.replace(/\/api$/, "");

    this.currentToken = token;
    this.socket = io(baseUrl, {
      path: "/communication.io",
      transports: ["websocket"],
      auth: {
        token,
      },
    });

    if (!this.socket.connected && !this.socket.active) {
      this.socket.connect();
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
  }

  getSocket(): CommunicationSocket | null {
    return this.socket;
  }
}

export const communicationSocketClient = new CommunicationSocketClient();
export const socketService = communicationSocketClient;
