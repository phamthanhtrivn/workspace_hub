import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { JwtIdentityGuard } from './jwt-identity.guard';
import { Reflector } from '@nestjs/core';

const SECRET = 'project-service-test-secret-at-least-32-bytes';
const USER_ID = '9d0deeb4-a868-45d9-923e-62feecde6a6e';

function token(overrides: Record<string, unknown> = {}, secret = SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: USER_ID,
    iss: 'workspace-hub',
    exp: Math.floor(Date.now() / 1000) + 60,
    ...overrides,
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function context(accessToken: string, userId = USER_ID): ExecutionContext {
  const request = {
    header: (name: string) => {
      if (name.toLowerCase() === 'authorization') return `Bearer ${accessToken}`;
      if (name.toLowerCase() === 'x-user-id') return userId;
      return undefined;
    },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => context,
    getClass: () => Object,
  } as unknown as ExecutionContext;
}

describe('JwtIdentityGuard', () => {
  const config = {
    jwtSecret: SECRET,
    jwtIssuer: 'workspace-hub',
  } as RuntimeConfigService;
  const guard = new JwtIdentityGuard(config, new Reflector());

  it('accepts a valid token matching the trusted user header', () => {
    const executionContext = context(token());

    expect(guard.canActivate(executionContext)).toBe(true);
    expect(executionContext.switchToHttp().getRequest().authenticatedUserId).toBe(USER_ID);
  });

  it('rejects a spoofed user header', () => {
    expect(() => guard.canActivate(context(token(), crypto.randomUUID()))).toThrow(UnauthorizedException);
  });

  it('rejects an invalid signature', () => {
    expect(() => guard.canActivate(context(token({}, `${SECRET}-wrong`)))).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    expect(() => guard.canActivate(context(token({ exp: 1 })))).toThrow(UnauthorizedException);
  });
});
