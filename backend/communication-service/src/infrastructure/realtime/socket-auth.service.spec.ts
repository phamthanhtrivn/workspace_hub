import { createHmac } from 'crypto';
import { SocketAuthService } from './socket-auth.service';

function createToken(payload: Record<string, unknown>, secret = 'test-secret') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString(
    'base64url',
  );
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

describe('SocketAuthService', () => {
  const previousSecret = process.env.JWT_SECRET_KEY;
  let service: SocketAuthService;

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = 'test-secret';
    service = new SocketAuthService();
  });

  afterAll(() => {
    process.env.JWT_SECRET_KEY = previousSecret;
  });

  it('verifies a valid HS256 token using sub as user id', () => {
    const token = createToken({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    expect(service.verifyToken(token)).toEqual({ userId: 'user-1' });
  });

  it('verifies a valid HS256 token using id as fallback user id', () => {
    const token = createToken({
      id: 'user-2',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    expect(service.verifyToken(token)).toEqual({ userId: 'user-2' });
  });

  it('rejects expired tokens', () => {
    const token = createToken({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    expect(service.verifyToken(token)).toBeNull();
  });

  it('rejects tokens with invalid signatures', () => {
    const token = createToken({ sub: 'user-1' }, 'wrong-secret');

    expect(service.verifyToken(token)).toBeNull();
  });

  it('rejects unsupported algorithms', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
      'base64url',
    );
    const body = Buffer.from(JSON.stringify({ sub: 'user-1' })).toString(
      'base64url',
    );
    const signature = createHmac('sha256', 'test-secret')
      .update(`${header}.${body}`)
      .digest('base64url');

    expect(service.verifyToken(`${header}.${body}.${signature}`)).toBeNull();
  });
});
