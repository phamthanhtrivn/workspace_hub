export const KAFKA_CONSUMER_HEARTBEAT_STALE_MS = 45000;
const failedPartitions = new Set<string>();
export const kafkaConsumerState = {
  joined: false,
  handlingFailed: false,
  lastHeartbeat: 0,
  recordHandlingResult(topic: string, partition: number, failed: boolean): void {
    const key = `${topic}:${partition}`;
    if (failed) failedPartitions.add(key);
    else failedPartitions.delete(key);
    this.handlingFailed = failedPartitions.size > 0;
  },
  ready(): boolean {
    return this.joined && !this.handlingFailed && Date.now() - this.lastHeartbeat < KAFKA_CONSUMER_HEARTBEAT_STALE_MS;
  },
  reset(): void {
    this.joined = false;
    this.lastHeartbeat = 0;
    failedPartitions.clear();
    this.handlingFailed = false;
  },
};
