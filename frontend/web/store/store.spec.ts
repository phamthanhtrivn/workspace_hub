import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { store } from './store';
import { setCredentials, clearCredentials } from './auth/auth-slice';
import { setActiveChat, setActiveSpaceId } from './chat/chat-slice';
import { setUnreadCount } from './notification/notification.slice';
import { USER_ROLES } from '../features/auth/types/auth.constants';

test('identity changes clear private Redux state while token refresh preserves the same user state', () => {
  const credentials = (userId: string, accessToken: string) => ({ userId, accessToken, email: `${userId}@example.test`, role: USER_ROLES.USER });
  store.dispatch(setCredentials(credentials('a', 'token-a')));
  store.dispatch(setActiveChat({ chatId: 'private-chat-a' }));
  store.dispatch(setActiveSpaceId('space-a'));
  store.dispatch(setUnreadCount(7));
  store.dispatch(setCredentials(credentials('a', 'refreshed-token-a')));
  assert.equal(store.getState().chat.activeChatId, 'private-chat-a');
  assert.equal(store.getState().notification.unreadCount, 7);
  store.dispatch(setCredentials(credentials('b', 'token-b')));
  assert.equal(store.getState().auth.userId, 'b');
  assert.equal(store.getState().chat.activeChatId, null);
  assert.equal(store.getState().chat.activeSpaceId, null);
  assert.equal(store.getState().notification.unreadCount, 0);
  store.dispatch(setActiveChat({ chatId: 'private-chat-b' }));
  store.dispatch(setUnreadCount(3));
  store.dispatch(clearCredentials());
  assert.equal(store.getState().auth.userId, null);
  assert.equal(store.getState().chat.activeChatId, null);
  assert.equal(store.getState().notification.unreadCount, 0);
});
