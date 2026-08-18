import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

type RedisEventClient = {
  on(event: 'error', listener: (error: Error) => void): RedisEventClient;
  on(
    event: 'reconnecting' | 'ready' | 'end',
    listener: () => void,
  ): RedisEventClient;
};

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });
    const subClient = pubClient.duplicate();

    this.registerRedisListeners(pubClient, 'pub');
    this.registerRedisListeners(subClient, 'sub');

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
    } catch (error) {
      console.warn(
        '[RedisIoAdapter] Redis unavailable, falling back to local Socket.IO adapter',
        error,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
    });
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  private registerRedisListeners(client: RedisEventClient, label: string) {
    client.on('error', (error) => {
      console.warn(`[RedisIoAdapter] Redis ${label} client error`, error);
    });
    client.on('reconnecting', () => {
      console.warn(`[RedisIoAdapter] Redis ${label} client reconnecting`);
    });
    client.on('ready', () => {
      console.log(`[RedisIoAdapter] Redis ${label} client ready`);
    });
    client.on('end', () => {
      console.warn(`[RedisIoAdapter] Redis ${label} client connection ended`);
    });
  }
}
