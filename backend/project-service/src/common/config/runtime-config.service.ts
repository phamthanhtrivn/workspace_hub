import { Injectable } from '@nestjs/common';

@Injectable()
export class RuntimeConfigService {
  readonly userServiceUrl = this.baseUrl(process.env.USER_SERVICE_URL ?? 'http://localhost:8081');
  readonly notificationServiceUrl = this.optionalBaseUrl(process.env.NOTIFICATION_SERVICE_URL);
  readonly frontendUrl = this.baseUrl(process.env.FRONTEND_URL ?? 'http://localhost:3000');
  readonly notificationServiceKey =
    process.env.NOTIFICATION_INTERNAL_SERVICE_KEY ?? process.env.INTERNAL_SERVICE_KEY;
  readonly httpTimeoutMs = this.positiveInteger(process.env.SERVICE_HTTP_TIMEOUT_MS, 5_000);

  private baseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }

  private optionalBaseUrl(value: string | undefined): string | undefined {
    return value ? this.baseUrl(value) : undefined;
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
