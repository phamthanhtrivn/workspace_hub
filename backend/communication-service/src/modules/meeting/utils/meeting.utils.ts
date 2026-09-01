import { randomBytes, randomUUID } from 'crypto';

export function createRoomName() {
  return `meeting_${randomUUID()}`;
}

export function createJoinToken() {
  return randomBytes(8).toString('base64url');
}
