const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ForbiddenException, NotFoundException } = require('@nestjs/common');
const { assertServiceKey } = require('../dist/common/internal-service-key');
const {
  InternalDocumentAccessController,
} = require('../dist/modules/document/internal-access.controller');
const calendarKey = 'fixture-calendar-document-not-production-000';
const aiKey = 'fixture-ai-document-not-production-000';

test('service keys have no public fallback and support bounded receiver-side rotation', () => {
  for (const supplied of [undefined, '', 'local-internal-key', aiKey]) {
    assert.throws(
      () => assertServiceKey(supplied, calendarKey),
      (e) => e.getStatus() === 401,
    );
  }
  for (const current of [undefined, '', 'local-internal-key']) {
    assert.throws(
      () => assertServiceKey(calendarKey, current, calendarKey),
      (e) => e.getStatus() === 401,
    );
  }
  assert.doesNotThrow(() => assertServiceKey(calendarKey, calendarKey));
  assert.doesNotThrow(() => assertServiceKey(calendarKey, ` ${calendarKey} `));
  assert.doesNotThrow(() => assertServiceKey(aiKey, calendarKey, aiKey));
});

test('Calendar endpoint authenticates before checking each unique document through DocumentService', async (t) => {
  const oldKey = process.env.CALENDAR_DOCUMENT_SERVICE_KEY;
  const oldPrevious = process.env.CALENDAR_DOCUMENT_SERVICE_KEY_PREVIOUS;
  process.env.CALENDAR_DOCUMENT_SERVICE_KEY = calendarKey;
  delete process.env.CALENDAR_DOCUMENT_SERVICE_KEY_PREVIOUS;
  t.after(() => {
    for (const [name, value] of [
      ['CALENDAR_DOCUMENT_SERVICE_KEY', oldKey],
      ['CALENDAR_DOCUMENT_SERVICE_KEY_PREVIOUS', oldPrevious],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const calls = [];
  let item = { type: 'FILE', isArchived: false };
  let failure;
  const controller = new InternalDocumentAccessController({
    checkPermission: async (...args) => {
      calls.push(args);
      if (failure) throw failure;
      return item;
    },
  });
  const body = {
    userId: randomUUID(),
    userEmail: 'owner@example.test',
    documentIds: [randomUUID(), randomUUID()],
  };
  for (const rejected of [undefined, 'local-internal-key', aiKey]) {
    await assert.rejects(
      controller.resolve(rejected, body),
      (e) => e.getStatus() === 401,
    );
  }
  assert.equal(calls.length, 0);
  const result = await controller.resolve(calendarKey, {
    ...body,
    documentIds: [...body.documentIds, body.documentIds[0]],
  });
  assert.deepEqual(result.data.documentIds, body.documentIds);
  assert.deepEqual(
    calls,
    body.documentIds.map((id) => [id, body.userId, body.userEmail]),
  );
  for (const invalid of [
    undefined,
    { ...body, userId: 'bad' },
    { ...body, userEmail: '' },
    { ...body, documentIds: [] },
    { ...body, documentIds: [null] },
    { ...body, documentIds: Array.from({ length: 51 }, randomUUID) },
  ]) {
    await assert.rejects(
      controller.resolve(calendarKey, invalid),
      (e) => e.getStatus() === 400,
    );
  }
  for (const unavailable of [
    { type: 'FILE', isArchived: true },
    { type: 'FOLDER', isArchived: false },
  ]) {
    item = unavailable;
    await assert.rejects(
      controller.resolve(calendarKey, body),
      (e) => e.getStatus() === 403,
    );
  }
  for (const exception of [new ForbiddenException(), new NotFoundException()]) {
    failure = exception;
    await assert.rejects(
      controller.resolve(calendarKey, body),
      (e) => e === exception,
    );
  }
});
