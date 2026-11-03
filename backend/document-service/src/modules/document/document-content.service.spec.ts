import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DocumentAccessService } from './document-access.service';
import { DocumentContentService } from './document-content.service';

void test('content URLs recheck public grants, reject tampering, and stay revoked after link re-enable', async () => {
  const previous = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = 'document-test-signing-secret-at-least-32-bytes';
  const file = {
    id: 'file',
    ownerUserId: 'owner',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    type: 'FILE',
    name: 'file.pdf',
    mimeType: 'application/pdf',
    s3Key: 'private-key',
    shares: [],
    linkAccess: 'VIEWER',
    shareToken: 'generation-1',
    shareExpiresAt: null,
  };
  const prisma = {
    documentItem: { findUnique: () => Promise.resolve(file) },
  } as unknown as PrismaService;
  let reads = 0,
    status = 0;
  let headers: Record<string, string> = {};
  const storage = {
    readAuthorizedContent: () => {
      reads++;
      return Promise.resolve({ ContentLength: 5 });
    },
  } as unknown as S3Service;
  const service = new DocumentContentService(
    prisma,
    new DocumentAccessService(prisma),
    storage,
  );
  const request = { method: 'HEAD', headers: {} } as Request;
  const response = {
    once: () => response,
    status: (value: number) => {
      status = value;
      return response;
    },
    set: (value: Record<string, string>) => { headers = value; return response; },
    setHeader: () => response,
    end: () => response,
  } as unknown as Response;
  try {
    const url = await service.issue('file', true, undefined);
    const ticket = new URL(url, 'https://api.example.test').searchParams.get(
      'ticket',
    )!;
    await service.stream(ticket, request, response);
    assert.equal(status, 200);
    assert.equal(reads, 1);
    file.mimeType = 'text/html';
    const htmlUrl = await service.issue('file', false, undefined);
    await service.stream(new URL(htmlUrl, 'https://api.example.test').searchParams.get('ticket')!, request, response);
    assert.ok(headers['Content-Disposition'].startsWith('attachment'));
    assert.ok(headers['Content-Security-Policy'].includes('sandbox'));
    file.mimeType = 'application/pdf';
    await assert.rejects(service.issue('file', false, 'old-version'));
    await assert.rejects(
      service.stream(ticket + 'tampered', request, response),
    );
    file.linkAccess = 'NONE';
    file.shareToken = 'generation-2';
    await assert.rejects(service.stream(ticket, request, response));
    file.linkAccess = 'VIEWER';
    await assert.rejects(service.stream(ticket, request, response));
    assert.equal(reads, 2);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = previous;
  }
});

void test('a signed content URL cannot keep a revoked user session alive', async () => {
  const previousFetch = globalThis.fetch;
  const previous = {
    jwt: process.env.JWT_SECRET_KEY,
    user: process.env.USER_SERVICE_URL,
    key: process.env.INTERNAL_SERVICE_KEY,
  };
  process.env.JWT_SECRET_KEY = 'document-test-signing-secret-at-least-32-bytes';
  process.env.USER_SERVICE_URL = 'https://user-service.invalid';
  process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';
  let active = true;
  globalThis.fetch = () =>
    Promise.resolve(new globalThis.Response(JSON.stringify({ active })));
  const sub = '00000000-0000-4000-8000-000000000001';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString(
    'base64url',
  );
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      sid: '00000000-0000-4000-8000-000000000002',
      email_verified: true,
      role: 'USER',
      iss: process.env.JWT_ISSUER || 'workspace-hub',
      exp: Math.floor(Date.now() / 1000) + 60,
      token_use: 'access',
    }),
  ).toString('base64url');
  const jwt = `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET_KEY).update(`${header}.${payload}`).digest('base64url')}`;
  const file = {
    id: 'file',
    ownerUserId: sub,
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    type: 'FILE',
    linkAccess: 'NONE',
    shares: [],
  };
  const prisma = {
    documentItem: { findUnique: () => Promise.resolve(file) },
  } as unknown as PrismaService;
  const service = new DocumentContentService(
    prisma,
    new DocumentAccessService(prisma),
    {} as S3Service,
  );
  try {
    const url = await service.issue('file', false, undefined, `Bearer ${jwt}`);
    active = false;
    await assert.rejects(
      service.stream(
        new URL(url, 'https://api.example.test').searchParams.get('ticket')!,
        {} as Request,
        {} as Response,
      ),
    );
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name, value] of [
      ['JWT_SECRET_KEY', previous.jwt],
      ['USER_SERVICE_URL', previous.user],
      ['INTERNAL_SERVICE_KEY', previous.key],
    ] as const)
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
  }
});
