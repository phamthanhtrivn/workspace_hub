import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { chatKeys, ChatScope } from '../types/chat.constant';
import type { ChatMessageResponse, ApiResponse, ThreadMessagesResponse } from '../types/chat.types';
import { mergeChatMessageUpdate, patchThreadMessageCaches } from './message-update-cache';

const root: ChatMessageResponse = { id: 'root', senderId: 'owner', type: 'TEXT', createdAt: '2026-10-24', content: JSON.stringify({ taskVersion: '2', title: 'Old' }) };
test('partial socket updates preserve message identity and reject stale task versions', () => {
  const updated = mergeChatMessageUpdate(root, { id: root.id, content: JSON.stringify({ taskVersion: '3', title: 'New', deleted: true }) });
  assert.equal(updated.senderId, root.senderId); assert.equal(updated.createdAt, root.createdAt);
  assert.equal(mergeChatMessageUpdate(updated, root), updated);
});
test('updates an open root and reply across thread caches while preserving discussion history', () => {
  const client = new QueryClient(); const key = chatKeys.threadMessages(ChatScope.CHANNEL, root.id);
  client.setQueryData(key, { success: true, data: { rootMessage: root, replies: [{ ...root, id: 'reply', content: 'Keep discussion' }] } });
  patchThreadMessageCaches(client, { id: root.id, content: JSON.stringify({ taskVersion: '3', deleted: true }) });
  const result = client.getQueryData<ApiResponse<ThreadMessagesResponse>>(key)!;
  assert.equal(JSON.parse(result.data.rootMessage!.content!).deleted, true);
  assert.equal(result.data.replies[0].content, 'Keep discussion');
  client.clear();
});
