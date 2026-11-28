import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  type ArgumentsHost,
  type HttpException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function responseFor(exception: HttpException) {
  let body: Record<string, unknown> = {};
  const response = {
    status: () => response,
    json: (payload: Record<string, unknown>) => {
      body = payload;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);

  return body;
}

void test('document access codes survive the API error envelope', () => {
  for (const code of [
    'DOCUMENT_ACCESS_RESTRICTED',
    'DOCUMENT_LINK_EXPIRED',
    'DOCUMENT_UNAVAILABLE',
  ]) {
    assert.equal(
      responseFor(
        new ForbiddenException({ code, message: 'Access unavailable' }),
      ).code,
      code,
    );
  }
  assert.equal(
    responseFor(
      new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: 'Missing' }),
    ).code,
    'DOCUMENT_NOT_FOUND',
  );
});

void test('unknown and server error codes remain private', () => {
  assert.equal(
    responseFor(
      new ForbiddenException({ code: 'INTERNAL_DETAIL', message: 'Forbidden' }),
    ).code,
    undefined,
  );
  const body = responseFor(
    new InternalServerErrorException({
      code: 'DOCUMENT_LINK_EXPIRED',
      message: 'Internal details',
    }),
  );
  assert.equal(body.code, undefined);
  assert.equal(body.message, 'Internal server error');
});

void test('document name conflicts keep their existing public code', () => {
  const body = responseFor(
    new ConflictException({
      code: 'DOCUMENT_NAME_CONFLICT',
      message: 'Name already exists',
    }),
  );
  assert.equal(body.code, 'DOCUMENT_NAME_CONFLICT');
});
