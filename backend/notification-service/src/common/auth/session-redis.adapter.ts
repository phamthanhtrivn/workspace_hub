import { SOCKET_SESSION } from "./socket-session.constants";
import { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server, ServerOptions } from "socket.io";

const REVOCATION_CHANNEL = SOCKET_SESSION.revocationChannel;
export class SessionRedisIoAdapter extends IoAdapter {
  private readonly publisher = createClient({ url: process.env.REDIS_URL });
  private readonly subscriber = this.publisher.duplicate();
  private readonly servers = new Set<Server>();
  constructor(app: INestApplicationContext) {
    super(app);
  }
  async connect(): Promise<void> {
    this.publisher.on("error", () => undefined);
    this.subscriber.on("error", () => undefined);
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    await this.subscriber.subscribe(REVOCATION_CHANNEL, (raw) => {
      try {
        const event = JSON.parse(raw) as {
          userId?: string;
          sessionId?: string;
        };
        const uuid = /^[0-9a-f-]{36}$/i;
        if (
          !event.userId ||
          !uuid.test(event.userId) ||
          (event.sessionId && !uuid.test(event.sessionId))
        )
          return;
        const room = event.sessionId
          ? SOCKET_SESSION.sessionRoom(event.sessionId)
          : SOCKET_SESSION.userRoom(event.userId);
        for (const server of this.servers)
          server.local.in(room).disconnectSockets(true);
      } catch {
        /* Invalid internal event cannot grant access. */
      }
    });
  }
  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(createAdapter(this.publisher, this.subscriber));
    this.servers.add(server);
    return server;
  }
  async close(server: Server): Promise<void> {
    this.servers.delete(server);
    await super.close(server);
    if (!this.servers.size)
      await Promise.all([this.publisher.close(), this.subscriber.close()]);
  }
}
