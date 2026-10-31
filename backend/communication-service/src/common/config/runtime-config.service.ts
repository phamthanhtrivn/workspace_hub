import { Injectable } from '@nestjs/common';
import { requireInternalServiceKey } from '../auth/service-key';

@Injectable()
export class RuntimeConfigService {
  readonly userServiceUrl = this.baseUrl(
    process.env.USER_SERVICE_URL ?? 'http://localhost:8081',
  );
  readonly projectServiceUrl = this.baseUrl(
    process.env.PROJECT_SERVICE_URL ?? 'http://localhost:8082',
  );
  readonly internalServiceKey = requireInternalServiceKey(
    process.env.INTERNAL_SERVICE_KEY,
  );
  readonly httpTimeoutMs = this.positiveInteger(
    process.env.SERVICE_HTTP_TIMEOUT_MS,
    5_000,
  );

  private baseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private optional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}
