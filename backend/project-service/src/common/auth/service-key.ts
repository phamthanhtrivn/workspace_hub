import { timingSafeEqual } from 'node:crypto';

export function isServiceKeyValid(supplied: unknown, expected: string | undefined): boolean {
  if (typeof supplied !== 'string' || (!expected?.trim() || expected.length < 32) || !supplied) return false;
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function requireInternalServiceKey(configured: string | undefined): string {
  if ((!configured?.trim() || configured.length < 32)) throw new Error('Service credential must be configured');
  return configured;
}
