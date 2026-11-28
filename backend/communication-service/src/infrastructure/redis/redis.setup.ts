import { INestApplication } from '@nestjs/common';
import { SessionRedisIoAdapter } from '../../common/auth/session-redis.adapter';

export async function setupRedis(app: INestApplication): Promise<void> {
  const redisIoAdapter = new SessionRedisIoAdapter(app);
  await redisIoAdapter.connect();
  app.useWebSocketAdapter(redisIoAdapter);
}
