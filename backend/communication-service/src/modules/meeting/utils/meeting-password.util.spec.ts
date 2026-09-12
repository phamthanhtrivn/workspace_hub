import {
  hashMeetingPassword,
  isMeetingPasswordValid,
} from './meeting-password.util';

describe('meeting password utilities', () => {
  it('does not hash empty passwords', () => {
    expect(hashMeetingPassword()).toBeNull();
    expect(hashMeetingPassword('   ')).toBeNull();
  });

  it('validates a hashed meeting password', () => {
    const passwordHash = hashMeetingPassword('room-secret');

    expect(passwordHash).toEqual(expect.any(String));
    expect(isMeetingPasswordValid(passwordHash, 'room-secret')).toBe(true);
    expect(isMeetingPasswordValid(passwordHash, 'wrong-secret')).toBe(false);
  });

  it('rejects malformed password hashes', () => {
    expect(isMeetingPasswordValid('not-a-valid-hash', 'room-secret')).toBe(
      false,
    );
  });
});
