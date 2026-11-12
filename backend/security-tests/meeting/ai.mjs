import assert from 'node:assert/strict';
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { aiRequire, load } from '../support.mjs';

// Runs the production summary API, BullMQ and processor. Only the media decoder
// boundary is replaced: this machine has no FFmpeg. Speech/LLM remain HTTP fakes.
export class MeetingAI {
  async start(h) {
    this.h = h;
    const commEnv = { ...process.env };
    Object.assign(process.env, {
      DATABASE_URL: h.infrastructure.dbUrl('ai'),
      AI_ENABLED: 'true',
      WORK_ASSISTANT_ENABLED: 'false',
      CONVERSATION_AI_ENABLED: 'false',
      VISUAL_ENABLED: 'false',
      AI_GATEWAY_KEY: h.keys.COMMUNICATION_TO_AI_KEY,
      AI_DOCUMENT_SERVICE_KEY: h.keys.COMMUNICATION_TO_AI_KEY,
      RAG_SERVICE_KEY: h.keys.COMMUNICATION_TO_AI_KEY,
      COMMUNICATION_SERVICE_URL: h.url,
      DOCUMENT_SERVICE_URL: h.providers.url,
      RAG_WORKER_URL: h.providers.url,
      LLM_BASE_URL: h.providers.url + '/v1',
      LLM_API_KEY: h.keys.LLM_API_KEY,
      LLM_MODEL: 'meeting-audit',
      LLM_REQUESTS_PER_MINUTE: '1000',
      LLM_TOKENS_PER_MINUTE: '10000000',
      LLM_REQUESTS_PER_DAY: '10000',
      LLM_QUOTA_WAIT_MS: '0',
      MEETING_STT_URL: h.providers.url,
      MEETING_STT_SERVICE_KEY: h.keys.MEETING_STT_SERVICE_KEY,
      MEETING_MEDIA_HOSTS: new URL(h.providers.url).host,
    });
    try {
      this.config = load('ai-service/api', 'config/env.config.js');
      this.database = load(
        'ai-service/api',
        'infrastructure/database/database.js',
      );
      const identity = await this.database.db.query(
        'SELECT current_database() AS name',
      );
      assert.equal(identity.rows[0].name, h.infrastructure.dbName('ai'));
      this.queues = load(
        'ai-service/api',
        'infrastructure/queue/notebook.queue.js',
      );
      this.media = load('ai-service/api', 'modules/meeting-summary/media.js');
      this.originalMedia = this.media.prepareAudioChunks;
      this.scratch = new Set();
      this.media.prepareAudioChunks = async (source, directory, signal) => {
        signal.throwIfAborted();
        this.scratch.add(directory);
        // Still exercise source download/size checking against the owned object endpoint.
        this.media.assertMediaUrl(source.url);
        const response = await fetch(source.url, { signal });
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(bytes.length, source.sizeBytes);
        const file = join(directory, 'audio-00000.wav');
        await writeFile(file, Buffer.from('RIFF-audit-wav-decoder-fixture'));
        return [file];
      };
      const { MeetingSummaryService } = load(
        'ai-service/api',
        'modules/meeting-summary/meeting-summary.service.js',
      );
      const { MeetingSummaryController } = load(
        'ai-service/api',
        'modules/meeting-summary/meeting-summary.controller.js',
      );
      const common = aiRequire('@nestjs/common'),
        { NestFactory } = aiRequire('@nestjs/core');
      this.service = new MeetingSummaryService();
      class AuditAIModule {}
      common.Module({
        controllers: [MeetingSummaryController],
        providers: [{ provide: MeetingSummaryService, useValue: this.service }],
      })(AuditAIModule);
      this.app = await NestFactory.create(AuditAIModule, {
        logger: false,
        abortOnError: false,
      });
      await this.app.listen(0, '127.0.0.1');
      this.url = await this.app.getUrl();
      h.allowedPorts.add(new URL(this.url).port);
      const { processMeetingSummary } = load(
        'ai-service/api',
        'jobs/meeting-summary.processor.js',
      );
      const { Worker } = aiRequire('bullmq');
      this.worker = new Worker(
        'meeting-summary-jobs',
        (job) => processMeetingSummary(job.data.recordingId, job.data.runId),
        {
          connection: this.config.connection,
          prefix: 'wh-notebook',
          concurrency: 1,
        },
      );
      this.workerErrors = [];
      this.worker.on('error', (error) => this.workerErrors.push(error));
      await this.worker.waitUntilReady();
      await h.infrastructure.redis.set(
        'wh-notebook:meeting-summary-worker-heartbeat',
        'ready:meeting-v1',
        'EX',
        600,
      );
    } finally {
      for (const key of Object.keys(process.env))
        if (!(key in commEnv)) delete process.env[key];
      Object.assign(process.env, commEnv);
    }
  }

  async assertScratchRemoved() {
    for (const directory of this.scratch)
      await assert.rejects(access(directory), { code: 'ENOENT' });
  }

  async close() {
    await this.worker?.close();
    await this.app?.close();
    if (this.media && this.originalMedia)
      this.media.prepareAudioChunks = this.originalMedia;
    await this.queues?.closeQueues();
    await this.database?.db.end();
    if (this.scratch) await this.assertScratchRemoved();
  }
}
