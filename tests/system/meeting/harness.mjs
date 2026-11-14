import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MeetingInfrastructure } from './infrastructure.mjs';
import { MeetingProviders } from './providers.mjs';
import { serviceRequire, load, webRequire, json, until } from '../support.mjs';

const require = serviceRequire('communication-service');
const service = (file, name) =>
  load('communication-service', `modules/meeting/${file}.js`)[name];
const make = (file, name, ...args) =>
  new (service(`services/${file}`, name))(...args);

export class MeetingHarness {
  infrastructure = new MeetingInfrastructure();
  providers = new MeetingProviders();
  clients = [];
  values = {};

  async start() {
    await this.infrastructure.prepare();
    this.previousEnv = { ...process.env };
    this.keys = Object.fromEntries(
      [
        'JWT_SECRET_KEY',
        'COMMUNICATION_TO_USER_KEY',
        'CALENDAR_TO_COMMUNICATION_KEY',
        'COMMUNICATION_TO_AI_KEY',
        'AI_TO_COMMUNICATION_KEY',
        'CAPTION_SERVICE_TOKEN',
        'LIVEKIT_API_SECRET',
        'MEETING_STT_SERVICE_KEY',
        'LLM_API_KEY',
      ].map((name) => [name, randomBytes(32).toString('hex')]),
    );
    await this.providers.start(this.keys, this.infrastructure.redis);
    Object.assign(process.env, this.keys, {
      NODE_ENV: 'test',
      JWT_ISSUER: 'workspace-hub',
      DATABASE_URL: this.infrastructure.dbUrl('communication'),
      REDIS_URL: `redis://127.0.0.1:${this.infrastructure.redisPort}`,
      USER_SERVICE_URL: this.providers.url,
      LIVEKIT_URL: this.providers.url,
      LIVEKIT_PUBLIC_URL: this.providers.url.replace('http:', 'ws:'),
      LIVEKIT_API_KEY: 'meeting-audit',
      LIVEKIT_RECORDING_TEMPLATE_URL: this.providers.url + '/template',
      MEETING_RECORDING_ENABLED: 'true',
      LIVEKIT_EGRESS_WEBHOOK_URL: this.providers.url + '/webhook',
      MEETING_RECORDING_MAX_CONCURRENT: '4',
      MEETING_RECORDING_WORKER_ROLE: 'control',
      AWS_S3_BUCKET_NAME: 'meeting-audit-only',
      AWS_REGION: 'test-region',
      AWS_ACCESS_KEY: 'test-only',
      AWS_SECRET_KEY: 'test-only',
      CAPTION_SERVICE_URL: this.providers.url,
      MEETING_SUMMARY_ENABLED: 'true',
      AI_SERVICE_URL: this.providers.url,
    });
    const nativeFetch = globalThis.fetch;
    this.nativeFetch = nativeFetch;
    this.allowedPorts = new Set([new URL(this.providers.url).port]);
    globalThis.fetch = (input, options) => {
      const url = new URL(
        typeof input === 'string' || input instanceof URL ? input : input.url,
      );
      assert.equal(
        url.hostname,
        '127.0.0.1',
        'audit HTTP may never leave its isolated loopback endpoints',
      );
      assert.ok(
        this.allowedPorts.has(url.port),
        'audit HTTP port belongs to this run',
      );
      return nativeFetch(input, options);
    };
    const { PrismaClient } = require('@prisma/client');
    this.db = new PrismaClient({
      datasources: { db: { url: this.infrastructure.dbUrl('communication') } },
    });
    await this.db.$connect();
    const identity = await this.db.$queryRaw`SELECT current_database() AS name`;
    assert.equal(identity[0].name, this.infrastructure.dbName('communication'));
    await this.seedActors();
    await this.configureKafka();
    await this.configureServices();
    await this.mountHttp();
    await this.mountSockets();
  }

  async seedActors() {
    this.actors = {};
    for (const name of ['host', 'cohost', 'member', 'other', 'outsider']) {
      const actor = {
        id: randomUUID(),
        sid: randomUUID(),
        name,
        email: `${name}@meeting-audit.invalid`,
      };
      const claims = {
        iss: 'workspace-hub',
        sub: actor.id,
        sid: actor.sid,
        role: 'USER',
        token_use: 'access',
        email_verified: true,
        email: actor.email,
        name,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      actor.claims = claims;
      actor.token = this.sign(claims);
      await this.infrastructure.redis.set(
        `meeting-audit:session:${actor.sid}`,
        actor.id,
        'EX',
        3600,
      );
      await this.db.userProfileSnapshot.create({
        data: { userId: actor.id, fullName: name, email: actor.email },
      });
      this.actors[name] = actor;
    }
  }

  sign(claims, key = this.keys.JWT_SECRET_KEY) {
    const encoded = [{ alg: 'HS256', typ: 'JWT' }, claims]
      .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
      .join('.');
    return `${encoded}.${createHmac('sha256', key).update(encoded).digest('base64url')}`;
  }

  async configureKafka() {
    const { ClientKafka } = require('@nestjs/microservices');
    this.kafkaClient = new ClientKafka({
      client: {
        clientId: `${this.infrastructure.id}-meeting`,
        brokers: [`127.0.0.1:${this.infrastructure.kafkaPort}`],
      },
      producerOnlyMode: true,
    });
    await this.kafkaClient.connect();
    const { KAFKA_TOPICS } = load(
      'communication-service',
      'common/constants/kafka.constants.js',
    );
    this.notificationTopic = KAFKA_TOPICS.NOTIFICATION_TOPIC;
    await this.infrastructure.admin.createTopics({
      topics: [
        {
          topic: this.notificationTopic,
          numPartitions: 1,
          replicationFactor: 1,
        },
      ],
    });
    this.notifications = [];
    this.consumer = this.infrastructure.kafka.consumer({
      groupId: this.infrastructure.id + '-notifications',
    });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.notificationTopic,
      fromBeginning: true,
    });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        this.notifications.push(JSON.parse(message.value.toString()));
      },
    });
  }

  async configureServices() {
    const { db } = this;
    const { LiveKitService } = load(
      'communication-service',
      'infrastructure/livekit/livekit.service.js',
    );
    this.livekit = new LiveKitService();
    this.storage = this.providers.storage();
    const { UserProfileSnapshotService } = load(
      'communication-service',
      'modules/user-profile-snapshot/user-profile-snapshot.service.js',
    );
    this.profiles = new UserProfileSnapshotService(db);
    this.policy = make('meeting-policy.service', 'MeetingPolicyService', db);
    this.presenter = make(
      'meeting-presenter.service',
      'MeetingPresenterService',
      this.livekit,
      this.profiles,
    );
    const { SocketRoomService } = load(
      'communication-service',
      'modules/socket/services/socket-room.service.js',
    );
    const { SocketEventEmitter } = load(
      'communication-service',
      'modules/socket/services/socket-event-emitter.js',
    );
    const { ChannelAccessService } = load(
      'communication-service',
      'modules/channel/access/channel-access.service.js',
    );
    const { MeetingSocketHandler } = load(
      'communication-service',
      'modules/socket/meeting/meeting-socket.handler.js',
    );
    this.rooms = new SocketRoomService();
    this.emitter = new SocketEventEmitter(
      this.rooms,
      new ChannelAccessService(db),
      db,
    );
    this.realtime = make(
      'meeting-realtime.service',
      'MeetingRealtimeService',
      this.livekit,
      this.profiles,
      new MeetingSocketHandler(this.emitter, this.rooms),
    );
    this.screens = make(
      'meeting-screen-share.service',
      'MeetingScreenShareService',
      db,
      this.policy,
      this.realtime,
    );
    this.participants = make(
      'meeting-participant.service',
      'MeetingParticipantService',
      db,
      this.profiles,
      this.policy,
      this.presenter,
      this.realtime,
      this.screens,
    );
    this.admission = make(
      'meeting-admission.service',
      'MeetingAdmissionService',
      db,
      this.profiles,
      this.policy,
      this.presenter,
      this.realtime,
    );
    this.history = make(
      'meeting-history.service',
      'MeetingHistoryService',
      db,
      this.profiles,
      this.presenter,
    );
    this.preferences = make(
      'meeting-history-preference.service',
      'MeetingHistoryPreferenceService',
      db,
      this.realtime,
    );
    this.bulk = make(
      'meeting-history-bulk.service',
      'MeetingHistoryBulkService',
      db,
      this.realtime,
    );
    const { MeetingSchedulePublisher } = load(
      'communication-service',
      'modules/meeting/events/meeting-schedule.publisher.js',
    );
    this.schedule = make(
      'meeting-schedule.service',
      'MeetingScheduleService',
      db,
      this.profiles,
      this.presenter,
      new MeetingSchedulePublisher(this.kafkaClient),
      this.realtime,
    );
    this.reactions = make(
      'meeting-room-reaction.service',
      'MeetingRoomReactionService',
      this.policy,
      this.realtime,
    );
    this.messages = make(
      'meeting-message.service',
      'MeetingMessageService',
      db,
      this.storage,
      this.profiles,
      this.policy,
      this.realtime,
    );
    this.recordingRequests = make(
      'meeting-recording-requests.service',
      'MeetingRecordingRequestsService',
      db,
      this.policy,
      this.realtime,
    );
    this.mediaAvailable = true;
    this.media = {
      isAvailable: () => this.mediaAvailable,
      cleanup: async () => {},
      assemble: async (id) => {
        const file = join(this.infrastructure.scratch, `${id}.mp4`);
        await writeFile(file, Buffer.from('test-mp4-provider'));
        return file;
      },
    };
    this.recordings = make(
      'meeting-recording.service',
      'MeetingRecordingService',
      db,
      this.livekit,
      this.storage,
      this.policy,
      this.realtime,
      this.media,
      this.recordingRequests,
    );
    this.segments = make(
      'meeting-recording-segments.service',
      'MeetingRecordingSegmentsService',
      db,
      this.storage,
      this.media,
    );
    this.worker = new (service(
      'services/meeting-recording.worker',
      'MeetingRecordingWorker',
    ))(
      db,
      this.livekit,
      this.storage,
      this.realtime,
      this.kafkaClient,
      this.segments,
      this.media,
      this.recordings,
    );
    const { DirectMessagePermissionService } = load(
      'communication-service',
      'modules/direct-message/direct-message-permission.service.js',
    );
    const dmPermissions = new DirectMessagePermissionService(db, {
      allowsNewDirectMessages: async () => true,
    });
    this.chatPublications = [];
    const chatPublisher = Object.fromEntries(
      [
        'publishChannelMessageCreated',
        'publishDirectMessageCreated',
        'publishChannelMessageUpdated',
        'publishDirectMessageUpdated',
      ].map((name) => [
        name,
        async (...args) => {
          this.chatPublications.push({ name, args });
        },
      ]),
    );
    this.room = make(
      'meeting-room.service',
      'MeetingRoomService',
      db,
      this.livekit,
      this.policy,
      this.presenter,
      this.realtime,
      this.screens,
      chatPublisher,
      dmPermissions,
      this.worker,
    );
    this.webhooks = make(
      'meeting-livekit-webhook.service',
      'MeetingLiveKitWebhookService',
      this.livekit,
      this.room,
      this.worker,
    );
    this.captions = make(
      'meeting-captions.service',
      'MeetingCaptionsService',
      this.policy,
      this.livekit,
    );
    this.calendar = make(
      'calendar-meeting-sync.service',
      'CalendarMeetingSyncService',
      db,
    );
    this.meetings = new (service('meeting.service', 'MeetingService'))(
      this.room,
      this.participants,
      this.admission,
      this.history,
      this.screens,
      this.schedule,
      this.reactions,
    );
    for (const value of [
      this.meetings,
      this.messages,
      this.recordings,
      this.recordingRequests,
      this.captions,
      this.preferences,
      this.bulk,
      this.calendar,
      this.webhooks,
    ])
      this.values[value.constructor.name] = value;
  }

  async mountHttp() {
    require('reflect-metadata');
    const common = require('@nestjs/common'),
      { NestFactory, Reflector } = require('@nestjs/core');
    const controllers = [
      ['meeting-recording.controller', 'MeetingRecordingController'],
      ['meeting-summary.controller', 'MeetingSummaryController'],
      ['meeting-summary.controller', 'MeetingSummarySourceController'],
      [
        'meeting-history-preference.controller',
        'MeetingHistoryPreferenceController',
      ],
      ['meeting-captions.controller', 'MeetingCaptionsController'],
      ['calendar-meeting-sync.controller', 'CalendarMeetingSyncController'],
      ['meeting.controller', 'MeetingController'],
      ['meeting-livekit-webhook.controller', 'MeetingLiveKitWebhookController'],
    ].map(([file, name]) => service(file, name));
    const providers = new Map();
    for (const controller of controllers)
      for (const token of Reflect.getMetadata(
        'design:paramtypes',
        controller,
      ) ?? []) {
        assert.ok(
          this.values[token.name],
          `real service wired for ${token.name}`,
        );
        providers.set(token, {
          provide: token,
          useValue: this.values[token.name],
        });
      }
    class AuditModule {}
    common.Module({ controllers, providers: [...providers.values()] })(
      AuditModule,
    );
    this.app = await NestFactory.create(AuditModule, {
      logger: false,
      abortOnError: false,
      rawBody: true,
    });
    const { JwtIdentityGuard } = load(
      'communication-service',
      'common/guards/jwt-identity.guard.js',
    );
    this.app.useGlobalGuards(new JwtIdentityGuard(new Reflector()));
    // Matches main.ts: whitelist=true, without enabling implicit transforms.
    this.app.useGlobalPipes(new common.ValidationPipe({ whitelist: true }));
    const { ResponseInterceptor } = load(
      'communication-service',
      'common/interceptors/response.interceptor.js',
    );
    const { GlobalExceptionFilter } = load(
      'communication-service',
      'common/filters/global-exception.filter.js',
    );
    this.app.useGlobalInterceptors(new ResponseInterceptor());
    this.app.useGlobalFilters(new GlobalExceptionFilter());
    this.app.set('json replacer', (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    await this.app.listen(0, '127.0.0.1');
    this.url = await this.app.getUrl();
    this.allowedPorts.add(new URL(this.url).port);
  }

  async mountSockets() {
    const { Server } = require('socket.io');
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { CommunicationGateway } = load(
      'communication-service',
      'modules/socket/communication.gateway.js',
    );
    this.socketHttp = createServer();
    this.io = new Server(this.socketHttp, { path: '/communication.io' });
    this.pub = createClient({ url: process.env.REDIS_URL });
    this.sub = this.pub.duplicate();
    await Promise.all([this.pub.connect(), this.sub.connect()]);
    this.io.adapter(createAdapter(this.pub, this.sub));
    this.gateway = new CommunicationGateway(
      {},
      this.emitter,
      this.rooms,
      this.db,
    );
    this.gateway.afterInit(this.io);
    this.io.on('connection', (socket) => {
      void this.gateway.handleConnection(socket);
      socket.on('meeting:join', (body, ack) => {
        void this.gateway
          .handleJoinMeetingRoom(body, socket)
          .then(() =>
            ack?.({
              joined: socket.rooms.has(this.rooms.meeting(body.meetingId)),
            }),
          );
      });
    });
    await new Promise((resolve) =>
      this.socketHttp.listen(0, '127.0.0.1', resolve),
    );
    this.socketUrl = `http://127.0.0.1:${this.socketHttp.address().port}`;
  }

  async socket(actor = this.actors.member) {
    const client = webRequire('socket.io-client').io(this.socketUrl, {
      path: '/communication.io',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      auth: { token: actor.token },
      timeout: 3000,
    });
    this.clients.push(client);
    await new Promise((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
      client.connect();
    });
    return client;
  }

  async request(path, { actor = this.actors.host, status, ...options } = {}) {
    const result = await json(this.url, '/api/meetings' + path, {
      token: actor?.token,
      ...options,
    });
    if (status !== undefined)
      assert.equal(
        result.status,
        status,
        `${options.method ?? 'GET'} ${path}: ${JSON.stringify(result.data)}`,
      );
    return { ...result, payload: result.data?.data };
  }

  async instant(options = {}) {
    const response = await this.request('/instant', {
      method: 'POST',
      body: { title: 'Meeting audit', autoAdmit: true, ...options },
      status: 201,
    });
    const meeting = await this.db.meeting.findUniqueOrThrow({
      where: { joinToken: response.payload.meeting.joinToken },
    });
    this.providers.connected(meeting.roomName, this.actors.host.id);
    return meeting;
  }

  async join(meeting, name = 'member', body = {}) {
    const actor = this.actors[name];
    const response = await this.request(`/${meeting.joinToken}/join`, {
      actor,
      method: 'POST',
      body,
      status: 201,
    });
    this.providers.connected(meeting.roomName, actor.id);
    return response.payload;
  }

  async scheduled(options = {}) {
    const start = new Date(Date.now() + 3600000),
      end = new Date(start.getTime() + 3600000);
    const result = await this.request('/scheduled', {
      method: 'POST',
      body: {
        title: 'Scheduled audit',
        scheduledStartAt: start.toISOString(),
        scheduledEndAt: end.toISOString(),
        inviteeIds: [this.actors.member.id, this.actors.other.id],
        ...options,
      },
      status: 201,
    });
    return this.db.meeting.findUniqueOrThrow({
      where: { joinToken: result.payload.joinToken },
    });
  }

  async readyRecording(meeting, overrides = {}) {
    const id = randomUUID(),
      key = `recordings/${meeting.id}/${id}.mp4`;
    this.providers.objects.set(key, Buffer.from('recorded-test-content'));
    return this.db.meetingRecording.create({
      data: {
        id,
        meetingId: meeting.id,
        ownerId: meeting.createdBy,
        startedBy: meeting.createdBy,
        status: 'COMPLETED',
        title: 'Audit recording',
        s3Key: key,
        fileName: `${id}.mp4`,
        mimeType: 'video/mp4',
        sizeBytes: 21n,
        durationSeconds: 10,
        completedAt: new Date(),
        stoppedAt: new Date(),
        ...overrides,
      },
    });
  }

  async close() {
    const failures = [];
    const settle = async (fn) => {
      try {
        await fn();
      } catch (error) {
        failures.push(error);
      }
    };
    for (const client of this.clients) client.close();
    await settle(async () => {
      if (this.io) await new Promise((resolve) => this.io.close(resolve));
    });
    await settle(async () => {
      if (this.socketHttp?.listening)
        await new Promise((resolve) => this.socketHttp.close(resolve));
    });
    await settle(() => this.app?.close());
    await settle(async () => {
      await this.pub?.quit();
      await this.sub?.quit();
    });
    await settle(() => this.consumer?.disconnect());
    await settle(() => this.kafkaClient?.close());
    await settle(() => this.db?.$disconnect());
    await settle(() => this.providers.close());
    if (this.nativeFetch) globalThis.fetch = this.nativeFetch;
    if (this.previousEnv) {
      for (const key of Object.keys(process.env))
        if (!(key in this.previousEnv)) delete process.env[key];
      Object.assign(process.env, this.previousEnv);
    }
    await settle(() => this.infrastructure.dispose());
    if (failures.length)
      throw new AggregateError(failures, 'Audit cleanup failed');
  }
}

export { assert, until, require, load };
