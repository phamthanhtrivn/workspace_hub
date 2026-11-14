import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import { json, until } from './support.mjs';

const password = 'SecurityTest42!Only';
export function signTestToken(state, changes = {}, header = { alg: 'HS256' }) {
  const parts = [header, { iss: 'workspace-hub', sub: state.actorA.id, sid: state.actorA.sid,
    role: 'USER', token_use: 'access', email_verified: true, email: state.actorA.email,
    exp: Math.floor(Date.now() / 1000) + 120, ...changes }].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url'));
  return `${parts.join('.')}.${createHmac('sha256', state.infrastructure.keys.JWT_SECRET_KEY).update(parts.join('.')).digest('base64url')}`;
}

export async function login(state, account, secret = password) {
  const result = await json(state.infrastructure.userUrl, '/api/auth/login', { method: 'POST', body: { email: account.email, password: secret } });
  assert.equal(result.status, 200, 'verified test account can sign in');
  assert.ok(result.data?.data?.accessToken && result.cookie, 'sign-in returns access token and refresh cookie');
  const claims = JSON.parse(Buffer.from(result.data.data.accessToken.split('.')[1], 'base64url'));
  return { ...account, token: result.data.data.accessToken, cookie: result.cookie, sid: claims.sid };
}

export async function account(state, { verify = true } = {}) {
  const value = { email: `${randomUUID()}@security.example.test`, fullName: `Security ${randomUUID()}` };
  const result = await json(state.infrastructure.userUrl, '/api/auth/register', { method: 'POST', body: { ...value, password } });
  assert.equal(result.status, 200, 'test registration succeeds');
  const user = await state.userDb.query('SELECT id FROM users WHERE email=$1', [value.email]);
  value.id = user.rows[0].id;
  if (verify) {
    const sent = await json(state.infrastructure.userUrl, '/api/auth/verification/send', { method: 'POST', body: { email: value.email } });
    assert.equal(sent.status, 200);
    const otp = await state.infrastructure.redis.get(`OTP_FORGOT_PWD:VERIFY_EMAIL:${value.email}`);
    assert.ok(otp, 'verification intent exists in isolated Redis');
    const confirmed = await json(state.infrastructure.userUrl, '/api/auth/verification/confirm', { method: 'POST', body: { email: value.email, otp } });
    assert.equal(confirmed.status, 200);
  }
  return value;
}

export function registerAuthTests(state) {
  test('real registration requires email verification; OTP is single use and purpose scoped', async () => {
    const user = await account(state, { verify: false });
    const call = (path, body) => json(state.infrastructure.userUrl, path, { method: 'POST', body });
    assert.notEqual((await call('/api/auth/login', { email: user.email, password })).status, 200);
    await call('/api/auth/verification/send', { email: user.email });
    const otp = await state.infrastructure.redis.get(`OTP_FORGOT_PWD:VERIFY_EMAIL:${user.email}`);
    const wrong = otp === '000000' ? '111111' : '000000';
    assert.notEqual((await call('/api/auth/verification/confirm', { email: user.email, otp: wrong })).status, 200);
    assert.notEqual((await call('/api/auth/verify-reset-otp', { email: user.email, otp })).status, 200);
    assert.equal((await call('/api/auth/verification/confirm', { email: user.email, otp })).status, 200);
    assert.notEqual((await call('/api/auth/verification/confirm', { email: user.email, otp })).status, 200);
    state.actorA = await login(state, user);
    state.actorB = await login(state, await account(state));
  });

  test('expired OTP and too many password guesses fail closed with real Redis', async () => {
    const user = await account(state, { verify: false });
    await json(state.infrastructure.userUrl, '/api/auth/verification/send', { method: 'POST', body: { email: user.email } });
    const key = `OTP_FORGOT_PWD:VERIFY_EMAIL:${user.email}`;
    const otp = await state.infrastructure.redis.get(key);
    await state.infrastructure.redis.pexpire(key, 1);
    await until(async () => (await state.infrastructure.redis.exists(key)) === 0, 'OTP expiry in isolated Redis');
    assert.notEqual((await json(state.infrastructure.userUrl, '/api/auth/verification/confirm', { method: 'POST', body: { email: user.email, otp } })).status, 200);
    let last;
    for (let index = 0; index < 11; index++) last = await json(state.infrastructure.userUrl, '/api/auth/login', { method: 'POST', body: { email: user.email, password: 'incorrect-password' } });
    assert.equal(last.status, 429);
  });

  test('direct User HTTP rejects forged identity, invalid lifetime, wrong purpose and algorithm', async () => {
    const path = '/api/users/me/profile';
    assert.equal((await json(state.infrastructure.userUrl, path, { headers: { 'x-user-id': state.actorB.id } })).status, 401);
    for (const token of ['invalid.jwt.token', signTestToken(state, { exp: 1 }), signTestToken(state, { sid: null }),
      signTestToken(state, { email_verified: false }), signTestToken(state, { token_use: 'password_reset' }),
      signTestToken(state, {}, { alg: 'HS512' })]) {
      assert.equal((await json(state.infrastructure.userUrl, path, { token })).status, 401);
    }
    const result = await json(state.infrastructure.userUrl, path, { token: state.actorA.token, headers: { 'x-user-id': state.actorB.id, 'x-user-role': 'ADMIN' } });
    assert.equal(result.status, 200);
    assert.equal(result.data.data.fullName, state.actorA.fullName, 'profile identity comes from verified JWT');
  });

  test('refresh rotation detects reuse and revokes only the compromised session family', async () => {
    const first = await login(state, state.actorA);
    const independent = await login(state, state.actorA);
    const rotated = await json(state.infrastructure.userUrl, '/api/auth/refresh', { method: 'POST', cookie: first.cookie });
    assert.equal(rotated.status, 200);
    assert.ok(rotated.cookie && rotated.cookie !== first.cookie, 'refresh rotates its credential');
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: first.token })).status, 200);
    await json(state.infrastructure.userUrl, '/api/auth/refresh', { method: 'POST', cookie: first.cookie });
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: rotated.data.data.accessToken })).status, 401);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: independent.token })).status, 200);
  });

  test('logout immediately denies access tokens from that family while another account stays active', async () => {
    const session = await login(state, state.actorA);
    assert.equal((await json(state.infrastructure.userUrl, '/api/auth/logout', { method: 'POST', cookie: session.cookie })).status, 200);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: session.token })).status, 401);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: state.actorB.token })).status, 200);
  });

  test('session revocation requires ownership and the account password', async () => {
    const own = await login(state, state.actorA);
    const findId = async (session) => (await state.userDb.query('SELECT id FROM refresh_tokens WHERE user_id=$1 AND family_id=$2 AND NOT revoked', [session.id, session.sid])).rows[0].id;
    const ownId = await findId(own), otherId = await findId(state.actorB);
    const revoke = (id, secret) => json(state.infrastructure.userUrl, `/api/users/me/sessions/${id}`, { method: 'DELETE', token: state.actorA.token, body: { password: secret } });
    assert.equal((await revoke(otherId, password)).status, 404);
    assert.notEqual((await revoke(ownId, 'incorrect-password')).status, 200);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: own.token })).status, 200);
    assert.equal((await revoke(ownId, password)).status, 200);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: own.token })).status, 401);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: state.actorA.token })).status, 200);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: state.actorB.token })).status, 200);
  });

  test('avatar URL issuance requires auth and limits unselected previews to their confirmed owner', async () => {
    const current = `/api/users/avatars/${state.actorA.id}/${randomUUID()}.png`;
    const preview = `/api/users/avatars/${state.actorA.id}/${randomUUID()}.png`;
    const saved = await state.userDb.query('SELECT avatar_url FROM user_profiles WHERE user_id=$1', [state.actorA.id]);
    const proof = `AVATAR_CONFIRMED:${state.actorA.id}:${preview}`;
    try {
      await state.userDb.query('UPDATE user_profiles SET avatar_url=$1 WHERE user_id=$2', [current, state.actorA.id]);
      assert.equal((await json(state.infrastructure.userUrl, current)).status, 401);
      const access = await json(state.infrastructure.userUrl, current, { token: state.actorB.token });
      assert.equal(access.status, 200, 'authenticated users may read the selected profile avatar');
      assert.ok(new URL(access.data.data.url).searchParams.has('X-Amz-Signature'));
      assert.equal((await json(state.infrastructure.userUrl, preview, { token: state.actorA.token })).status, 404);
      await state.infrastructure.redis.set(proof, 'fixture-confirmed-key', 'EX', 60);
      assert.equal((await json(state.infrastructure.userUrl, preview, { token: state.actorA.token })).status, 200);
      assert.equal((await json(state.infrastructure.userUrl, preview, { token: state.actorB.token })).status, 404);
      await state.infrastructure.redis.del(proof);
      assert.equal((await json(state.infrastructure.userUrl, preview, { token: state.actorA.token })).status, 404);
    } finally {
      await state.infrastructure.redis.del(proof);
      await state.userDb.query('UPDATE user_profiles SET avatar_url=$1 WHERE user_id=$2', [saved.rows[0].avatar_url, state.actorA.id]);
    }
  });

  test('password reset grants are single use and revoke all existing account sessions', async () => {
    const user = await login(state, await account(state));
    const call = (path, body) => json(state.infrastructure.userUrl, path, { method: 'POST', body });
    assert.equal((await call('/api/auth/forgot-password', { email: user.email })).status, 200);
    const otp = await state.infrastructure.redis.get(`OTP_FORGOT_PWD:FORGOT_PASSWORD:${user.email}`);
    const verified = await call('/api/auth/verify-reset-otp', { email: user.email, otp });
    assert.equal(verified.status, 200);
    const resetToken = verified.data.data.resetToken;
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: resetToken })).status, 401);
    const body = { email: user.email, resetToken, newPassword: 'ChangedSecurity42!Only' };
    assert.equal((await call('/api/auth/reset-password', body)).status, 200);
    assert.notEqual((await call('/api/auth/reset-password', body)).status, 200);
    assert.equal((await json(state.infrastructure.userUrl, '/api/users/me/profile', { token: user.token })).status, 401);
    await login(state, user, body.newPassword);
  });

  test('Redis outage prevents login token issuance and verification intents, then recovers', async () => {
    const f = state.infrastructure;
    const before = (await state.userDb.query('SELECT count(*)::int AS count FROM refresh_tokens WHERE user_id=$1', [state.actorA.id])).rows[0].count;
    f.redis.disconnect();
    await f.control('stop', 'redis');
    try {
      const denied = await json(f.userUrl, '/api/auth/login', { method: 'POST', body: { email: state.actorA.email, password } });
      assert.ok(denied.status >= 500, 'unavailable attempt limiter must not issue credentials');
      assert.equal(denied.cookie, undefined);
      assert.equal((await state.userDb.query('SELECT count(*)::int AS count FROM refresh_tokens WHERE user_id=$1', [state.actorA.id])).rows[0].count, before);
      const verification = await json(f.userUrl, '/api/auth/verification/send', { method: 'POST', body: { email: state.actorB.email } });
      assert.ok(verification.status >= 500);
    } finally {
      await f.control('start', 'redis');
      await until(async () => {
        if (['end', 'wait'].includes(f.redis.status)) await f.redis.connect();
        return (await f.redis.ping()) === 'PONG';
      }, 'isolated Redis recovery');
    }
    const recovered = await until(async () => {
      const result = await json(f.userUrl, '/api/auth/login', { method: 'POST', body: { email: state.actorA.email, password } });
      return result.status === 200 ? result : false;
    }, 'User Lettuce connection recovers after Redis restart', 15000);
    assert.ok(recovered.data?.data?.accessToken && recovered.cookie);
  });
}
