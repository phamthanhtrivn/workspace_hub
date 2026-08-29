import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface SocketAuthContext {
  userId: string;
}

interface JwtPayload {
  exp?: number;
  id?: string;
  sub?: string;
}

interface JwtHeader {
  alg?: string;
}

@Injectable()
export class SocketAuthService {
  verifyToken(token: string): SocketAuthContext | null {
    const [headerBase64, payloadBase64, signatureBase64] = token.split('.');
    if (!headerBase64 || !payloadBase64 || !signatureBase64) return null;

    const secret = process.env.JWT_SECRET_KEY?.trim();
    if (!secret) return null;

    const header = this.decodeJson<JwtHeader>(headerBase64);
    if (header?.alg !== 'HS256') return null;

    const expectedSignature = this.sign(
      `${headerBase64}.${payloadBase64}`,
      secret,
    );
    if (!this.isEqualSignature(signatureBase64, expectedSignature)) {
      return null;
    }

    const payload = this.decodeJson<JwtPayload>(payloadBase64);
    const userId = payload?.sub ?? payload?.id;
    if (!payload || !userId) return null;

    if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId };
  }

  private sign(value: string, secret: string) {
    return createHmac('sha256', secret)
      .update(value)
      .digest('base64url');
  }

  private isEqualSignature(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private decodeJson<T>(value: string): T | null {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString()) as T;
    } catch {
      return null;
    }
  }
}
