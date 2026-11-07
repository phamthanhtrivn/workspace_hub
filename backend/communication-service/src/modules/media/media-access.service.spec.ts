import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MediaAccessService } from './media-access.service';

function fixture() {
  const prisma = {
    media: { findMany: async () => [] as { message: { channelId: string } }[] },
    directMedia: { findMany: async () => [] as { message: { conversationId: string } }[] },
    meetingMedia: { findMany: async () => [] },
  };
  const channels = { assertPrivateAccess: async (_id: string, _actor: string) => {} };
  const direct = { assertCanRead: async (_id: string, _actor: string) => {} };
  const service = new MediaAccessService(prisma as never, channels as never, direct as never, {} as never);
  return { prisma, channels, direct, service };
}

test('unreferenced objects and keys outside chat media are refused', async () => {
  const { service } = fixture();
  await assert.rejects(service.assertCanRead('documents/owner/file', 'actor'), NotFoundException);
  await assert.rejects(service.assertCanRead('chat-media/chat/file', 'actor'), NotFoundException);
});

test('each attachment read rechecks channel access, including forwarded references', async () => {
  const f = fixture();
  f.prisma.media.findMany = async () => [{ message: { channelId: 'denied' } }, { message: { channelId: 'allowed' } }];
  f.channels.assertPrivateAccess = async (id) => { if (id === 'denied') throw new NotFoundException(); };
  await f.service.assertCanRead('chat-media/source/file', 'actor');
  f.channels.assertPrivateAccess = async () => { throw new NotFoundException(); };
  await assert.rejects(f.service.assertCanRead('chat-media/source/file', 'actor'), NotFoundException);
});

test('authorization dependency failures do not grant attachment access', async () => {
  const f = fixture();
  f.prisma.media.findMany = async () => [{ message: { channelId: 'project-channel' } }];
  f.channels.assertPrivateAccess = async () => { throw new ServiceUnavailableException(); };
  await assert.rejects(f.service.assertCanRead('chat-media/chat/file', 'actor'), ServiceUnavailableException);
});

test('direct attachments require read membership without requiring permission to send', async () => {
  const f = fixture();
  f.prisma.directMedia.findMany = async () => [{ message: { conversationId: 'dm' } }];
  let checked = false;
  f.direct.assertCanRead = async (id, actor) => { checked = id === 'dm' && actor === 'actor'; };
  await f.service.assertCanRead('chat-media/dm/file', 'actor');
  assert.equal(checked, true);
});
