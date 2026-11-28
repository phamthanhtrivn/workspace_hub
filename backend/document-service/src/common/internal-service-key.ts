import { UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

export function assertServiceKey(
  supplied: string | undefined,
  current: string | undefined,
  previous?: string,
) {
  current = current?.trim();
  previous = previous?.trim();
  if (!current || current.length < 32 || typeof supplied !== 'string')
    throw new UnauthorizedException('Internal authentication required');
  const input = Buffer.from(supplied);
  const matches = [current, previous]
    .filter((key): key is string => Boolean(key && key.length >= 32))
    .some((key) => {
      const expected = Buffer.from(key);
      return (
        input.length === expected.length && timingSafeEqual(input, expected)
      );
    });
  if (!matches) throw new UnauthorizedException('Invalid internal service key');
}
