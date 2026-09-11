import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { PrismaService } from '../prisma/prisma.service';
import { getKafkaBrokers } from '../infrastructure/kafka/kafka.config';

type DependencyCheck = {
  name: string;
  status: 'ok' | 'error';
  message?: string;
};

const SERVICE_NAME = 'calendar-service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return this.response('ok', []);
  }

  @Get('ready')
  async ready() {
    const checks = await Promise.all([this.checkDatabase(), this.checkKafka()]);
    const isReady = checks.every((check) => check.status === 'ok');

    if (!isReady) {
      throw new ServiceUnavailableException({
        message: 'Service dependencies are not ready',
        ...this.response('unready', checks),
      });
    }

    return this.response('ready', checks);
  }

  private response(status: 'ok' | 'ready' | 'unready', checks: DependencyCheck[]) {
    return {
      service: SERVICE_NAME,
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { name: 'database', status: 'ok' };
    } catch (error) {
      return this.errorCheck('database', error);
    }
  }

  private async checkKafka(): Promise<DependencyCheck> {
    const kafka = new Kafka({
      clientId: `${SERVICE_NAME}-health`,
      brokers: getKafkaBrokers(),
      connectionTimeout: 3_000,
      requestTimeout: 3_000,
      retry: { retries: 0 },
    });
    const admin = kafka.admin();

    try {
      await admin.connect();
      await admin.listTopics();
      return { name: 'kafka', status: 'ok' };
    } catch (error) {
      return this.errorCheck('kafka', error);
    } finally {
      await admin.disconnect().catch(() => undefined);
    }
  }

  private errorCheck(name: string, error: unknown): DependencyCheck {
    return {
      name,
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
