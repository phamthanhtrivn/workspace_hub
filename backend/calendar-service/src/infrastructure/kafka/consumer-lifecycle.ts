export const KAFKA_CONSUMER_HEARTBEAT_STALE_MS = 45000;
export const kafkaConsumerState = {
  joined: false,
  handlingFailed: false,
  lastHeartbeat: 0,
  ready(): boolean {
    return this.joined && !this.handlingFailed && Date.now() - this.lastHeartbeat < KAFKA_CONSUMER_HEARTBEAT_STALE_MS;
  },
  reset(): void { this.joined = false; this.lastHeartbeat = 0; },
};
