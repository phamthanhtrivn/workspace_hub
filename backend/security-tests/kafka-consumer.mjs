import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { projectRequire, load, until } from './support.mjs';
import { withPrisma } from './resource-access.mjs';

export function registerConsumerTests(state) {
  test('real Nest Kafka transport preserves failed offsets, quarantines poison events, and rejects replay/stale revisions', { timeout: 180000 }, async () => {
    await withPrisma(state, ['project'], async ({ project }) => {
      const { Module } = projectRequire('@nestjs/common');
      const { NestFactory } = projectRequire('@nestjs/core');
      const { logLevel } = projectRequire('kafkajs');
      const { PrismaService } = load('project-service', 'common/prisma/prisma.service.js');
      const { UserProfileSnapshotConsumer } = load('project-service', 'modules/user-profile-snapshot/user-profile-snapshot.consumer.js');
      const { UserProfileSnapshotService } = load('project-service', 'modules/user-profile-snapshot/user-profile-snapshot.service.js');
      const { UserEventInterceptor } = load('project-service', 'infrastructure/kafka/user-event.interceptor.js');
      const { TrackedKafkaServer } = load('project-service', 'infrastructure/kafka/tracked-kafka.server.js');
      const { kafkaConsumerState } = load('project-service', 'infrastructure/kafka/consumer-lifecycle.js');
      const { KAFKA_CONFIG } = load('project-service', 'infrastructure/kafka/kafka.constants.js');
      const topic = KAFKA_CONFIG.TOPIC, groupId = state.infrastructure.id;
      await state.infrastructure.admin.createTopics({ topics: [{ topic, numPartitions: 1, replicationFactor: 1 }] });
      class ConsumerModule {}
      Module({ controllers: [UserProfileSnapshotConsumer], providers: [UserProfileSnapshotService, UserEventInterceptor, { provide: PrismaService, useValue: project }] })(ConsumerModule);
      const strategy = new TrackedKafkaServer({ client: { clientId: groupId, brokers: [`127.0.0.1:${state.infrastructure.kafkaPort}`], logLevel: logLevel.NOTHING },
        consumer: { groupId, sessionTimeout: 10000, heartbeatInterval: 1000 }, subscribe: { fromBeginning: true }, run: { autoCommitInterval: 100 } });
      const app = await NestFactory.createMicroservice(ConsumerModule, { strategy, logger: false, abortOnError: false });
      const producer = state.infrastructure.kafka.producer();
      try {
        await app.listen(); await producer.connect();
        await until(() => kafkaConsumerState.ready(), 'consumer group joined with heartbeat');
        const userId = randomUUID();
        const event = (revision, fullName) => ({ userId, eventId: randomUUID(), schemaVersion: 1, revision: String(revision), occurredAt: new Date().toISOString(), eventType: 'USER_PROFILE_SNAPSHOT_UPSERTED', email: 'event@security.example.test', fullName });
        const send = async (value) => (await producer.send({ topic, messages: [{ key: userId, value: JSON.stringify(value) }] }))[0];
        const first = await send(event(2, 'Initial'));
        await until(async () => (await project.userProfileSnapshot.findUnique({ where: { userId } }))?.fullName === 'Initial', 'initial profile snapshot');
        const committedOffset = async () => {
          const offsets = await state.infrastructure.admin.fetchOffsets({ groupId: `${groupId}-server`, topics: [topic] });
          return offsets[0]?.partitions.find((partition) => partition.partition === 0)?.offset ?? '-1';
        };
        await until(async () => BigInt(await committedOffset()) > BigInt(first.baseOffset), 'successful event offset committed');
        await state.infrastructure.control('stop', 'postgres');
        let failed;
        try {
          failed = await send(event(3, 'Recovered'));
          await until(() => kafkaConsumerState.handlingFailed, 'database failure reached consumer');
          assert.equal(kafkaConsumerState.ready(), false);
          assert.ok(BigInt(await committedOffset()) <= BigInt(failed.baseOffset), 'failed event must not be committed past');
        } finally { await state.infrastructure.control('start', 'postgres'); }
        await until(async () => (await project.userProfileSnapshot.findUnique({ where: { userId } }))?.fullName === 'Recovered', 'failed record retried after DB recovery', 60000);
        await until(() => kafkaConsumerState.ready(), 'consumer readiness after recovery');
        await send(event(1, 'Stale overwrite'));
        await send(event(3, 'Duplicate overwrite'));
        const barrier = await send(event(4, 'Latest'));
        await until(async () => BigInt(await committedOffset()) > BigInt(barrier.baseOffset), 'replay and new event offsets committed');
        assert.equal((await project.userProfileSnapshot.findUnique({ where: { userId } })).fullName, 'Latest');
        const poison = await send({ ...event(5, 'Poison'), revision: 'invalid' });
        await until(async () => (await project.$queryRaw`SELECT id FROM rejected_kafka_events WHERE topic=${topic} AND partition=0 AND "offset"=${poison.baseOffset}`).length === 1, 'poison event recorded before skipping');
        const following = await send(event(6, 'After poison'));
        await until(async () => BigInt(await committedOffset()) > BigInt(following.baseOffset), 'partition progresses after poison event');
        assert.equal((await project.userProfileSnapshot.findUnique({ where: { userId } })).fullName, 'After poison');
        // A stopped consumer must immediately stop reporting readiness.
        await app.close();
        assert.equal(kafkaConsumerState.ready(), false);
      } finally { await producer.disconnect(); await app.close(); }
    });
  });
}
