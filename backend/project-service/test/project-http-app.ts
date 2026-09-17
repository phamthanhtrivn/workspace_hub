import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { JwtIdentityGuard } from '../src/common/auth/jwt-identity.guard';
import { AccessTokenVerifier } from '../src/common/auth/access-token-verifier';
import { RuntimeConfigService } from '../src/common/config/runtime-config.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TaskController } from '../src/modules/task/task.controller';
import { TaskService } from '../src/modules/task/task.service';

const secret = 'isolated-project-http-test-secret-32-bytes';

export function authHeaders(userId: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, iss: 'workspace-hub', exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return { authorization: `Bearer ${header}.${payload}.${signature}`, 'x-user-id': userId };
}

export async function withProjectHttpApp(tasks: TaskService, check: (url: string) => Promise<void>) {
  const module = await Test.createTestingModule({
    controllers: [TaskController],
    providers: [{ provide: TaskService, useValue: tasks }],
  }).compile();
  const app = module.createNestApplication();
  const config = { jwtSecret: secret, jwtIssuer: 'workspace-hub' } as RuntimeConfigService;
  app.useGlobalGuards(new JwtIdentityGuard(new AccessTokenVerifier(config), new Reflector()));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  try {
    await app.listen(0, '127.0.0.1');
    await check(await app.getUrl());
  } finally {
    await app.close();
  }
}
