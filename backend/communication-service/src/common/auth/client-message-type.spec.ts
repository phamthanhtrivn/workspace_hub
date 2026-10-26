import { MessageType } from '@prisma/client';
import { assertClientMessageType } from './client-message-type';
describe('trusted message types', () => {
  it('rejects AI spoofing, client SYSTEM messages and unknown enum values', () => {
    for (const type of [
      MessageType.AI,
      MessageType.SYSTEM,
      'FORGED' as MessageType,
    ])
      expect(() => assertClientMessageType(type)).toThrow();
    expect(() => assertClientMessageType(MessageType.AI, true)).toThrow();
  });
  it('allows normal messages and explicit internal system messages', () => {
    expect(() => assertClientMessageType()).not.toThrow();
    expect(() => assertClientMessageType(MessageType.POLL)).not.toThrow();
    expect(() =>
      assertClientMessageType(MessageType.SYSTEM, true),
    ).not.toThrow();
  });
});
