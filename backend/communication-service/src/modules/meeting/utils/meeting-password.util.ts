import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PASSWORD_KEY_LENGTH = 64;

export function hashMeetingPassword(password?: string | null): string | null {
  const normalizedPassword = password?.trim();
  if (!normalizedPassword) return null;

  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(
    normalizedPassword,
    salt,
    PASSWORD_KEY_LENGTH,
  ).toString('hex');

  return `${salt}:${hash}`;
}

export function isMeetingPasswordValid(
  passwordHash: string | null | undefined,
  password?: string,
): boolean {
  if (!passwordHash) return true;
  const [salt, expectedHash] = passwordHash.split(':');
  if (!salt || !expectedHash) return false;

  const candidateHash = scryptSync(
    password?.trim() ?? '',
    salt,
    PASSWORD_KEY_LENGTH,
  );
  const expected = Buffer.from(expectedHash, 'hex');

  return (
    candidateHash.length === expected.length &&
    timingSafeEqual(candidateHash, expected)
  );
}
