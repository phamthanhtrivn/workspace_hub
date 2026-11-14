import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { serviceRequire } from '../support.mjs';

const { ForbiddenException } = serviceRequire('communication-service')(
  '@nestjs/common',
);
const { TokenVerifier } = serviceRequire('communication-service')(
  'livekit-server-sdk',
);

export class MeetingProviders {
  rooms = new Map();
  egress = new Map();
  objects = new Map();
  calls = [];
  failures = new Map();
  sessions = new Map();
  summaries = new Map();
  holds = new Map();

  async start(keys, redis) {
    this.keys = keys;
    this.redis = redis;
    this.server = createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        if (!response.headersSent)
          response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Simulated provider failure' }));
      });
    });
    await new Promise((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${this.server.address().port}`;
  }

  async handle(request, response) {
    const url = new URL(request.url, this.url);
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    let body;
    try {
      body = raw.length ? JSON.parse(raw.toString()) : {};
    } catch {
      body = {};
    }
    this.calls.push({ path: url.pathname, method: request.method, body });
    if (this.holds.has(url.pathname)) await this.holds.get(url.pathname);
    const failure = this.failures.get(url.pathname);
    const send = (status, payload) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(payload));
    };
    if (failure)
      return send(failure, { code: 'unavailable', msg: 'Injected outage' });
    if (url.pathname === '/api/users/internal/sessions/authorize') {
      if (
        request.headers['x-internal-service-key'] !==
        this.keys.COMMUNICATION_TO_USER_KEY
      )
        return send(403, {});
      return send(200, {
        active:
          (await this.redis.get(`meeting-audit:session:${body.sessionId}`)) ===
          body.userId,
      });
    }
    if (url.pathname.startsWith('/twirp/')) {
      assert.match(request.headers.authorization ?? '', /^Bearer /);
      await new TokenVerifier(
        'meeting-audit',
        this.keys.LIVEKIT_API_SECRET,
      ).verify(request.headers.authorization.slice(7));
      const method = url.pathname.split('/').at(-1);
      if (method === 'CreateRoom') {
        const room = this.rooms.get(body.name) ?? {
          sid: `RM_${randomUUID().replaceAll('-', '')}`,
          name: body.name,
          participants: new Map(),
        };
        this.rooms.set(body.name, room);
        return send(200, { name: room.name, sid: room.sid });
      }
      if (method === 'DeleteRoom') {
        this.rooms.delete(body.room);
        return send(200, {});
      }
      if (method === 'ListParticipants')
        return send(200, {
          participants: [
            ...(this.rooms.get(body.room)?.participants.values() ?? []),
          ],
        });
      if (method === 'RemoveParticipant') {
        this.rooms.get(body.room)?.participants.delete(body.identity);
        return send(200, {});
      }
      if (method === 'GetParticipant' || method === 'UpdateParticipant')
        return send(200, {
          sid: 'PA_test',
          identity: body.identity,
          metadata: body.metadata ?? '',
          permission: body.permission,
        });
      if (method === 'ListRooms')
        return send(200, {
          rooms: [...this.rooms.values()].map(({ name, sid }) => ({
            name,
            sid,
          })),
        });
      if (method === 'ListEgress')
        return send(200, { items: [...this.egress.values()] });
      if (method === 'StopEgress')
        return send(
          200,
          this.egress.get(body.egressId) ?? {
            egressId: body.egressId,
            status: 'EGRESS_COMPLETE',
          },
        );
      if (method.startsWith('Start')) {
        const entry = {
          egressId: `EG_${randomUUID().replaceAll('-', '')}`,
          roomName: body.roomName,
          status: 'EGRESS_ACTIVE',
          startedAt: String(BigInt(Date.now()) * 1000000n),
          ...(method === 'StartEgress' ? { egress: body } : {}),
        };
        this.egress.set(entry.egressId, entry);
        return send(200, entry);
      }
      return send(501, { code: 'unimplemented', msg: method });
    }
    if (url.pathname === '/sessions') {
      if (
        request.headers.authorization !==
        `Bearer ${this.keys.CAPTION_SERVICE_TOKEN}`
      )
        return send(403, {});
      this.sessions.set(body.meetingId, body);
      return send(200, {
        workerIdentity: 'caption-audit-worker',
        language: 'vi',
      });
    }
    if (url.pathname.startsWith('/sessions/')) {
      this.sessions.clear();
      return send(200, { released: true });
    }
    if (url.pathname === '/transcribe') {
      assert.equal(
        request.headers['x-internal-service-key'],
        this.keys.MEETING_STT_SERVICE_KEY,
      );
      assert.equal(request.headers['content-type'], 'audio/wav');
      assert.ok(raw.length);
      return send(200, {
        text: 'Nhóm thống nhất kiểm tra quyền recording trước khi phát hành.',
      });
    }
    if (url.pathname === '/v1/chat/completions') {
      assert.equal(
        request.headers.authorization,
        `Bearer ${this.keys.LLM_API_KEY}`,
      );
      assert.ok(body.messages?.length >= 2);
      return send(200, {
        id: 'audit-completion',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'meeting-audit',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                'Nội dung chính: kiểm tra quyền recording. Người phụ trách và hạn: chưa xác định.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
      });
    }
    if (url.pathname.startsWith('/internal/meeting-summaries/')) {
      if (
        request.headers['x-internal-service-key'] !==
        this.keys.COMMUNICATION_TO_AI_KEY
      )
        return send(403, {});
      const id = url.pathname.split('/')[3];
      if (!url.pathname.endsWith('/status'))
        this.summaries.set(id, {
          status: 'COMPLETED',
          content: 'Audit summary',
          transcribedChunks: 1,
        });
      return send(200, this.summaries.get(id) ?? { status: 'NOT_CREATED' });
    }
    if (url.pathname === '/storage/sign')
      return send(200, {
        url: `${this.url}/objects/${encodeURIComponent(body.key)}`,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    if (url.pathname.startsWith('/objects/')) {
      const key = decodeURIComponent(url.pathname.slice('/objects/'.length));
      const value = this.objects.get(key);
      if (!value) return send(404, {});
      response.writeHead(200, {
        'content-type': 'video/mp4',
        'content-length': value.length,
      });
      response.end(value);
      return;
    }
    return send(404, { message: 'Unknown test provider route' });
  }

  connected(roomName, userId) {
    const room = this.rooms.get(roomName);
    assert.ok(room, 'fake media room exists');
    room.participants.set(userId, { sid: 'PA_' + userId, identity: userId });
  }

  storage() {
    return {
      assertAttachments: async (medias, scope) => {
        for (const media of medias) {
          assert.ok(scope.actorId && scope.referenceId);
          if (
            !media.s3Key.startsWith(`meeting-test/${scope.referenceId}/`) ||
            !this.objects.has(media.s3Key)
          )
            throw new ForbiddenException('Unconfirmed test attachment');
        }
      },
      generateRecordingUrl: async (key) => {
        const response = await fetch(`${this.url}/storage/sign`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        if (!response.ok) throw new Error('Simulated storage unavailable');
        return response.json();
      },
      headRecording: async (key) => ({
        ContentLength: this.objects.get(key)?.length ?? 0,
        ContentType: 'video/mp4',
      }),
      getFileSize: async (key) => BigInt(this.objects.get(key)?.length ?? 0),
      deleteFile: async (key) => {
        this.objects.delete(key);
      },
      deleteRecording: async (key) => {
        this.objects.delete(key);
      },
    };
  }

  async close() {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise((resolve) => this.server.close(resolve));
    this.objects.clear();
    this.rooms.clear();
    this.sessions.clear();
    this.summaries.clear();
  }
}
