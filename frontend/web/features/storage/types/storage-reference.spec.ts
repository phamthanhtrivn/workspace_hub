import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLegacyStorageUrl, isPrivateStorageReference } from './storage-reference';

test('only storage access routes can receive an authenticated URL-resolution request', () => {
  assert.equal(isPrivateStorageReference('/api/medias/access-url?key=chat-media%2Fchat%2Ffile'), true);
  assert.equal(isPrivateStorageReference('/api/calendar/pomodoro/audios/rain/access-url'), true);
  for (const source of ['//attacker.invalid/api/medias/access-url?key=x', 'https://attacker.invalid/image',
    '/api/users/me/sessions', '/api/medias/access-url?key=x&redirect=https://attacker.invalid',
    '/api/calendar/pomodoro/audios/rain/access-url#other']) {
    assert.equal(isPrivateStorageReference(source), false);
  }
});

test('staging objects cannot become avatar access references', () => {
  const owner = '00000000-0000-4000-8000-000000000001';
  assert.equal(isPrivateStorageReference(`/api/users/avatars/${owner}/${owner}.png`), true);
  assert.equal(isPrivateStorageReference(`/api/users/avatars/staging/${owner}/${owner}.png`), false);
});

test('old public storage URLs are distinguished from external identity-provider avatars', () => {
  assert.equal(isLegacyStorageUrl('https://old.cloudfront.net/avatars/file.png'), true);
  assert.equal(isLegacyStorageUrl('https://old.s3.ap-southeast-2.amazonaws.com/avatars/file.png'), true);
  assert.equal(isLegacyStorageUrl('https://lh3.googleusercontent.com/avatar'), false);
});
