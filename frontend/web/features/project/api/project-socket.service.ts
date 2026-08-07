import { io, Socket } from 'socket.io-client';

class ProjectSocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (!this.socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const baseUrl = apiUrl.replace(/\/api$/, '');

      this.socket = io(baseUrl, {
        path: '/project.io',
        auth: { token },
      });
    }

    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const projectSocketService = new ProjectSocketService();
