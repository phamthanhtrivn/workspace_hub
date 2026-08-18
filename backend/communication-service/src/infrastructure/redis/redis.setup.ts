import { INestApplication } from '@nestjs/common';
import { RedisIoAdapter } from '../../common/adapters/redis-io.adapter';

export async function setupRedis(app: INestApplication): Promise<void> {
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
}
