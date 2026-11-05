import { ServerKafka } from '@nestjs/microservices';
import type { Consumer } from 'kafkajs';
import { kafkaConsumerState } from './consumer-lifecycle';

export class TrackedKafkaServer extends ServerKafka {
  protected registerConsumerEventListeners(): void {
    super.registerConsumerEventListeners();
    const consumer = this.consumer as unknown as Consumer | null;
    if (!consumer) return;
    consumer.on(consumer.events.GROUP_JOIN, () => {
      kafkaConsumerState.joined = true;
      kafkaConsumerState.lastHeartbeat = Date.now();
    });
    consumer.on(consumer.events.HEARTBEAT, () => { kafkaConsumerState.lastHeartbeat = Date.now(); });
    consumer.on(consumer.events.REBALANCING, () => kafkaConsumerState.reset());
    consumer.on(consumer.events.DISCONNECT, () => kafkaConsumerState.reset());
    consumer.on(consumer.events.STOP, () => kafkaConsumerState.reset());
    consumer.on(consumer.events.CRASH, () => kafkaConsumerState.reset());
  }
  async close(): Promise<void> {
    kafkaConsumerState.reset();
    await super.close();
  }
}
