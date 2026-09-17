import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isUUID } from 'class-validator';
import { RuntimeConfigService } from '../config/runtime-config.service';

interface JwtHeader {
  alg?: unknown;
}

interface JwtPayload {
  sub?: unknown;
  iss?: unknown;
  exp?: unknown;
  nbf?: unknown;
}

@Injectable()
export class AccessTokenVerifier {
  constructor(private readonly config: RuntimeConfigService) {}

  verify(token: string): string {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid access token');

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = this.decodePart<JwtHeader>(encodedHeader);
    const payload = this.decodePart<JwtPayload>(encodedPayload);
    if (header.alg !== 'HS256') throw new UnauthorizedException('Invalid access token algorithm');

    const expected = createHmac('sha256', this.config.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const actual = this.decodeSignature(encodedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Invalid access token signature');
    }

    this.validateClaims(payload);
    return payload.sub as string;
  }

  private validateClaims(payload: JwtPayload): void {
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) {
      throw new UnauthorizedException('Invalid access token subject');
    }
    if (payload.iss !== this.config.jwtIssuer) {
      throw new UnauthorizedException('Invalid access token issuer');
    }
    if (typeof payload.exp !== 'number' || payload.exp <= now) {
      throw new UnauthorizedException('Access token has expired');
    }
    if (payload.nbf !== undefined && (typeof payload.nbf !== 'number' || payload.nbf > now)) {
      throw new UnauthorizedException('Access token is not active');
    }
  }

  private decodePart<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid access token encoding');
    }
  }

  private decodeSignature(value: string): Buffer {
    try {
      return Buffer.from(value, 'base64url');
    } catch {
      throw new UnauthorizedException('Invalid access token signature');
    }
  }
}
