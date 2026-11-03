import type { DocumentItem } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { verifyAccessClaims } from '../../common/auth/access-token';
import { assertActiveSession } from '../../common/auth/session-authorization';
import { DocumentRole } from '../../common/enums/document.enum';
import { DocumentAccessService } from './document-access.service';

const CONTENT_PATH = '/api/documents/public/content';
const TICKET_LIFETIME_SECONDS = 600;
const INLINE_CONTENT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain']);
interface ContentTicket {
  purpose: 'document-content';
  id: string;
  versionId?: string;
  download: boolean;
  expires: number;
  stamp: string;
  actor?: { sub: string; sid: string; exp: number; email?: string };
}

@Injectable()
export class DocumentContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly storage: S3Service,
  ) {}

  private key(): string {
    const key = process.env.JWT_SECRET_KEY;
    if (!key || Buffer.byteLength(key) < 32)
      throw new ServiceUnavailableException(
        'Document content signing is not configured',
      );
    return key;
  }

  private async stamp(id: string): Promise<string> {
    const chain: unknown[] = [];
    const visited = new Set<string>();
    let current: string | null = id;
    while (current) {
      if (visited.has(current) || visited.size > 128)
        throw new ForbiddenException('Invalid document hierarchy');
      visited.add(current);
      const item: Pick<DocumentItem, 'id' | 'parentFolderId' | 'linkAccess' | 'shareToken' | 'shareExpiresAt'> | null = await this.prisma.documentItem.findUnique({
        where: { id: current },
        select: {
          id: true,
          parentFolderId: true,
          linkAccess: true,
          shareToken: true,
          shareExpiresAt: true,
        },
      });
      if (!item) throw new NotFoundException('Document unavailable');
      chain.push([
        item.id,
        item.linkAccess,
        item.shareToken,
        item.shareExpiresAt,
      ]);
      current = item.parentFolderId;
    }
    return createHash('sha256').update(JSON.stringify(chain)).digest('hex');
  }

  async issue(
    id: string,
    download: boolean,
    versionId: string | undefined,
    authorization?: string,
  ): Promise<string> {
    const token = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    const identity = token ? verifyAccessClaims(token) : undefined;
    if (identity) await assertActiveSession(identity);
    const item = await this.access.checkPermission(
      id,
      identity?.sub,
      typeof identity?.email === 'string' ? identity.email : undefined,
      versionId ? DocumentRole.EDITOR : DocumentRole.VIEWER,
    );
    if (item.type !== 'FILE' || item.isArchived)
      throw new BadRequestException('File is unavailable');
    const ticket: ContentTicket = {
      purpose: 'document-content',
      id,
      versionId,
      download,
      expires: Math.floor(Date.now() / 1000) + TICKET_LIFETIME_SECONDS,
      stamp: await this.stamp(id),
      actor: identity
        ? {
            sub: identity.sub,
            sid: identity.sid,
            exp: identity.exp,
            email:
              typeof identity.email === 'string' ? identity.email : undefined,
          }
        : undefined,
    };
    const encoded = Buffer.from(JSON.stringify(ticket)).toString('base64url');
    const signature = createHmac('sha256', this.key())
      .update(encoded)
      .digest('base64url');
    return `${CONTENT_PATH}?ticket=${encoded}.${signature}`;
  }

  async stream(
    raw: string,
    request: Request,
    response: Response,
  ): Promise<void> {
    let ticket: ContentTicket;
    try {
      if (typeof raw !== 'string' || raw.length > 8192) throw new Error();
      const parts = raw.split('.');
      if (parts.length !== 2) throw new Error();
      const signature = Buffer.from(parts[1], 'base64url');
      const expected = createHmac('sha256', this.key())
        .update(parts[0])
        .digest();
      if (
        signature.length !== expected.length ||
        !timingSafeEqual(signature, expected)
      )
        throw new Error();
      ticket = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString(),
      ) as ContentTicket;
      if (
        ticket.purpose !== 'document-content' ||
        !Number.isSafeInteger(ticket.expires) ||
        ticket.expires * 1000 <= Date.now()
      )
        throw new Error();
    } catch {
      throw new ForbiddenException('Invalid or expired document URL');
    }
    if (ticket.actor) await assertActiveSession(ticket.actor);
    const item = await this.access.checkPermission(
      ticket.id,
      ticket.actor?.sub,
      ticket.actor?.email,
      ticket.versionId ? DocumentRole.EDITOR : DocumentRole.VIEWER,
    );
    if (item.isArchived || ticket.stamp !== (await this.stamp(ticket.id)))
      throw new ForbiddenException('Document URL has been revoked');
    let key = item.s3Key;
    if (ticket.versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: ticket.versionId, documentItemId: item.id },
      });
      if (!version) throw new NotFoundException('Version unavailable');
      key = version.s3Key;
    }
    if (!key) throw new NotFoundException('File unavailable');
    const abort = new AbortController();
    response.once('close', () => abort.abort());
    const object = await this.storage.readAuthorizedContent(
      key,
      request.headers.range,
      request.method === 'HEAD',
      abort.signal,
    );
    const safeInlineContent = INLINE_CONTENT_TYPES.has(item.mimeType ?? '');
    response.status(object.ContentRange ? 206 : 200);
    response.set({
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      ...(!safeInlineContent ? { 'Content-Security-Policy': "sandbox; default-src 'none'" } : {}),
      'Content-Type': item.mimeType || 'application/octet-stream',
      'Content-Disposition': `${ticket.download || !safeInlineContent ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(item.name).replace(/'/g, '%27')}`,
    });
    if (object.ContentLength !== undefined)
      response.setHeader('Content-Length', object.ContentLength);
    if (object.ContentRange)
      response.setHeader('Content-Range', object.ContentRange);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    if (!object.Body) throw new NotFoundException('File unavailable');
    try {
      await pipeline(object.Body as import('node:stream').Readable, response, {
        signal: abort.signal,
      });
    } catch (error) {
      if (!abort.signal.aborted) throw error;
    }
  }
}
