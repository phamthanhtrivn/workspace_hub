import { timingSafeEqual } from 'node:crypto';

export function isServiceKeyValid(supplied: unknown, expected: string | undefined): boolean {
  if (typeof supplied !== 'string' || !expected?.trim() || !supplied) return false;
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function requireInternalServiceKey(configured: string | undefined): string {
  if (!configured?.trim()) throw new Error('INTERNAL_SERVICE_KEY must be configured');
  return configured;
}
