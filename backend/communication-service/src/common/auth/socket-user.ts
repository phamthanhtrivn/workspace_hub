import { Socket } from 'socket.io';

export function socketUserId(client: Socket): string | undefined {
  const state: unknown = client.data;
  return typeof state === 'object' &&
    state !== null &&
    'userId' in state &&
    typeof state.userId === 'string'
    ? state.userId
    : undefined;
}
