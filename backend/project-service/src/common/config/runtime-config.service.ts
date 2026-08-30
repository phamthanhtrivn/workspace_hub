import { Injectable } from '@nestjs/common';

@Injectable()
export class RuntimeConfigService {
  readonly userServiceUrl = this.baseUrl(process.env.USER_SERVICE_URL ?? 'http://localhost:8081');
  readonly notificationServiceUrl = this.requiredBaseUrl(
    process.env.NOTIFICATION_SERVICE_URL,
    'NOTIFICATION_SERVICE_URL',
  );
  readonly frontendUrl = this.baseUrl(process.env.FRONTEND_URL ?? 'http://localhost:3000');
  readonly notificationServiceKey = this.required(
    process.env.NOTIFICATION_INTERNAL_SERVICE_KEY ?? process.env.INTERNAL_SERVICE_KEY,
    'NOTIFICATION_INTERNAL_SERVICE_KEY or INTERNAL_SERVICE_KEY',
  );
  readonly httpTimeoutMs = this.positiveInteger(process.env.SERVICE_HTTP_TIMEOUT_MS, 5_000);
  readonly outboxPollIntervalMs = this.positiveInteger(process.env.OUTBOX_POLL_INTERVAL_MS, 2_000);
  readonly outboxBatchSize = this.positiveInteger(process.env.OUTBOX_BATCH_SIZE, 20);
  readonly outboxMaxAttempts = this.positiveInteger(process.env.OUTBOX_MAX_ATTEMPTS, 5);
  readonly jwtIssuer = process.env.JWT_ISSUER?.trim() || 'workspace-hub';
  readonly corsAllowedOrigins = this.list(
    process.env.CORS_ALLOWED_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:3000',
  );

  get jwtSecret(): string {
    const value = process.env.JWT_SECRET_KEY;
    if (!value || Buffer.byteLength(value) < 32) {
      throw new Error('JWT_SECRET_KEY must be configured with at least 32 bytes');
    }
    return value;
  }

  private baseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }

  private requiredBaseUrl(value: string | undefined, key: string): string {
    return this.baseUrl(this.required(value, key));
  }

  private required(value: string | undefined, key: string): string {
    if (!value?.trim()) throw new Error(`${key} must be configured`);
    return value;
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private list(value: string): string[] {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}
