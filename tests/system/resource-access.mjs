import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { serviceRequire, load } from './support.mjs';
import { mount } from './http-boundaries.mjs';

export async function withPrisma(state, services, check) {
  const clients = {};
  try {
    for (const service of services) {
      const { PrismaClient } = serviceRequire(`${service}-service`)('@prisma/client');
      clients[service] = new PrismaClient({ datasources: { db: { url: state.infrastructure.dbUrl(service) } } });
      await clients[service].$connect();
    }
    return await check(clients);
  } finally { await Promise.all(Object.values(clients).map((client) => client.$disconnect())); }
}

export async function seedProject(db, ownerId) {
  return db.project.create({ data: { name: 'Security integration', ownerId, status: 'ACTIVE', createdAt: new Date() } });
}

export function registerResourceTests(state) {
  test('revoked project membership denies stale Document and Chat grants through the real authority', async () => {
    await withPrisma(state, ['project', 'document', 'communication'], async ({ project, document, communication }) => {
      const owned = await seedProject(project, state.actorA.id);
      await project.projectMember.create({ data: { projectId: owned.id, userId: state.actorB.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date(), updatedAt: new Date(), canEditDocuments: false } });
      const { ProjectAccessService } = load('project-service', 'modules/project/project-access.service.js');
      const access = new ProjectAccessService(project);
      const endpoint = await mount('project-service', load('project-service', 'modules/project/project-authorization.controller.js').ProjectAuthorizationController, { values: { ProjectAccessService: access } });
      const oldUrl = process.env.PROJECT_SERVICE_URL;
      process.env.PROJECT_SERVICE_URL = endpoint.url;
      try {
        await assert.rejects(access.authorizeResource(state.actorB.id, owned.id, 'EDIT_DOCUMENTS'));
        await access.authorizeResource(state.actorA.id, owned.id, 'EDIT_DOCUMENTS');
        const item = await document.documentItem.create({ data: { ownerUserId: state.actorA.id, ownerEmail: state.actorA.email, projectId: owned.id, name: 'Project document', type: 'FOLDER',
          shares: { create: { shareWithUserId: state.actorB.id, shareWithEmail: state.actorB.email, permission: 'EDITOR' } } } });
        const { DocumentAccessService } = load('document-service', 'modules/document/document-access.service.js');
        const documents = new DocumentAccessService(document);
        const space = await communication.space.create({ data: { name: 'Project space', createdBy: state.actorA.id, projectId: owned.id, members: { create: { userId: state.actorB.id, role: 'MEMBER' } } } });
        const channel = await communication.channel.create({ data: { name: 'Project channel', spaceId: space.id, createdBy: state.actorA.id } });
        const { ChannelAccessService } = load('communication-service', 'modules/channel/access/channel-access.service.js');
        const channels = new ChannelAccessService(communication);
        await documents.checkPermission(item.id, state.actorB.id, state.actorB.email);
        await channels.assertPrivateAccess(channel.id, state.actorB.id);
        await project.projectMember.deleteMany({ where: { projectId: owned.id, userId: state.actorB.id } });
        await assert.rejects(documents.checkPermission(item.id, state.actorB.id, state.actorB.email));
        await assert.rejects(channels.assertPrivateAccess(channel.id, state.actorB.id));
        assert.equal(await document.documentShare.count({ where: { documentItemId: item.id } }), 1, 'stale local share remains but cannot grant access');
        process.env.PROJECT_SERVICE_URL = 'http://127.0.0.1:1';
        await assert.rejects(documents.checkPermission(item.id, state.actorA.id, state.actorA.email), (error) => error.getStatus?.() === 503);
      } finally { process.env.PROJECT_SERVICE_URL = oldUrl; await endpoint.app.close(); }
    });
  });

  test('real document grants and public tickets stay revoked across link re-enable', async () => {
    await withPrisma(state, ['document'], async ({ document }) => {
      const item = await document.documentItem.create({ data: { ownerUserId: state.actorA.id, ownerEmail: state.actorA.email, name: 'private.txt', type: 'FILE',
        mimeType: 'text/plain', s3Key: `documents/${state.actorA.id}/${randomUUID()}.txt`, linkAccess: 'NONE' } });
      const { DocumentAccessService } = load('document-service', 'modules/document/document-access.service.js');
      const access = new DocumentAccessService(document);
      await assert.rejects(access.checkPermission(item.id, state.actorB.id, state.actorB.email));
      const share = await document.documentShare.create({ data: { documentItemId: item.id, shareWithEmail: state.actorB.email, permission: 'EDITOR' } });
      await access.checkPermission(item.id, state.actorB.id, state.actorB.email, 'EDITOR');
      assert.equal((await document.documentShare.findUnique({ where: { id: share.id } })).shareWithUserId, state.actorB.id);
      await document.documentShare.delete({ where: { id: share.id } });
      await assert.rejects(access.checkPermission(item.id, state.actorB.id, state.actorB.email));
      await document.documentItem.update({ where: { id: item.id }, data: { linkAccess: 'EDITOR', shareToken: randomUUID() } });
      assert.equal(await access.getPermissionRole(item.id), 'VIEWER');
      await assert.rejects(access.checkPermission(item.id, undefined, undefined, 'EDITOR'));
      const { DocumentContentService } = load('document-service', 'modules/document/document-content.service.js');
      let storageReads = 0;
      const content = new DocumentContentService(document, access, { readAuthorizedContent: async () => { storageReads++; return { ContentLength: 1 }; } });
      const reference = await content.issue(item.id, false);
      const ticket = new URL(reference, 'http://test.invalid').searchParams.get('ticket');
      const response = { once() {}, status() {}, set() {}, setHeader() {}, end() {} };
      await content.stream(ticket, { method: 'HEAD', headers: {} }, response);
      assert.equal(storageReads, 1);
      await document.documentItem.update({ where: { id: item.id }, data: { linkAccess: 'NONE', shareToken: randomUUID() } });
      for (const method of ['GET', 'HEAD']) await assert.rejects(content.stream(ticket, { method, headers: { range: 'bytes=0-1' } }, response));
      await document.documentItem.update({ where: { id: item.id }, data: { linkAccess: 'VIEWER' } });
      await assert.rejects(content.stream(ticket, { method: 'HEAD', headers: {} }, response));
      assert.equal(storageReads, 1, 'revoked tickets never reach storage');
    });
  });

  test('Calendar refuses a different owner before mutation; chat media rechecks membership and recall', async () => {
    await withPrisma(state, ['calendar', 'communication'], async ({ calendar, communication }) => {
      const { CalendarService } = load('calendar-service', 'modules/calendar/calendar.service.js');
      const calendars = new CalendarService(calendar);
      const owned = await calendars.createCalendar(state.actorA.id, { name: 'Private calendar' });
      await assert.rejects(calendars.updateCalendar(state.actorB.id, owned.id, { name: 'Forged change' }));
      assert.equal((await calendar.calendar.findUnique({ where: { id: owned.id } })).name, 'Private calendar');
      const space = await communication.space.create({ data: { name: 'Personal space', createdBy: state.actorA.id, members: { create: { userId: state.actorA.id, role: 'ADMIN' } } } });
      const channel = await communication.channel.create({ data: { name: 'Private channel', spaceId: space.id, createdBy: state.actorA.id, ownerId: state.actorA.id, visibility: 'PRIVATE', members: { create: { userId: state.actorA.id } } } });
      const key = `chat-media/${channel.id}/${randomUUID()}_file.txt`;
      const message = await communication.message.create({ data: { channelId: channel.id, senderId: state.actorA.id, type: 'TEXT', medias: { create: { name: 'file.txt', mimeType: 'text/plain', sizeBytes: 1, s3Key: key, type: 'FILE' } } } });
      const { ChannelAccessService } = load('communication-service', 'modules/channel/access/channel-access.service.js');
      const { MediaAccessService } = load('communication-service', 'modules/media/media-access.service.js');
      const media = new MediaAccessService(communication, new ChannelAccessService(communication), {}, {});
      await media.assertCanRead(key, state.actorA.id);
      await assert.rejects(media.assertCanRead(key, state.actorB.id));
      await communication.message.update({ where: { id: message.id }, data: { recalled: true } });
      await assert.rejects(media.assertCanRead(key, state.actorA.id));
    });
  });
}
