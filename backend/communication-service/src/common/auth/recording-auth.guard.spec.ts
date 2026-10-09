import { createHmac } from 'crypto';
import { verifyRecordingUserToken } from './recording-auth.guard';

describe('recording JWT authentication', () => {
  const secret = 'test-recording-signature-key';
  const sub = '951b9697-a1d5-4af0-9014-1dafad039f51';
  const token = (
    claims: Record<string, unknown> = {},
    alg = 'HS256',
    signingSecret = secret,
  ) => {
    const body = [
      { alg },
      {
        sub,
        iss: 'workspace-hub',
        exp: Math.floor(Date.now() / 1000) + 60,
        role: 'USER',
        ...claims,
      },
    ]
      .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
      .join('.');
    return `${body}.${createHmac('sha256', signingSecret).update(body).digest('base64url')}`;
  };
  beforeEach(() => {
    process.env.JWT_SECRET_KEY = secret;
  });
  it('verifies the same HS256 format emitted by user-service', () =>
    expect(verifyRecordingUserToken(token())).toBe(sub));
  it('rejects wrong signatures', () =>
    expect(() =>
      verifyRecordingUserToken(token({}, 'HS256', 'wrong')),
    ).toThrow());
  it.each([
    { exp: 1 },
    { iss: 'other' },
    { role: 'RESET_PASSWORD_ROLE' },
    { sub: 'not-a-user' },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
  ])('rejects invalid access claims %j', (claims) =>
    expect(() => verifyRecordingUserToken(token(claims))).toThrow(),
  );
  it('rejects algorithm substitution', () =>
    expect(() => verifyRecordingUserToken(token({}, 'none'))).toThrow());
  it('fails closed when the signing secret is missing', () => {
    delete process.env.JWT_SECRET_KEY;
    expect(() => verifyRecordingUserToken(token())).toThrow();
  });
});
