import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProjectAuthorizationController } from '../../modules/project/project-authorization.controller';
import { ProjectAccessService } from '../../modules/project/project-access.service';

test('project authorization accepts only scoped callers and denies legacy keys and communication writes', async () => {
  const names = ['DOCUMENT_TO_PROJECT_KEY', 'COMMUNICATION_TO_PROJECT_KEY', 'INTERNAL_SERVICE_KEY'] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const documentKey = 'd'.repeat(64), communicationKey = 'c'.repeat(64);
  process.env.DOCUMENT_TO_PROJECT_KEY = documentKey;
  process.env.COMMUNICATION_TO_PROJECT_KEY = communicationKey;
  process.env.INTERNAL_SERVICE_KEY = 'legacy'.repeat(10);
  let authorizations = 0;
  const access = { authorizeResource: async () => { authorizations++; return { allowed: true }; } } as unknown as ProjectAccessService;
  const controller = new ProjectAuthorizationController(access);
  const request = { userId: '00000000-0000-4000-8000-000000000001', projectId: '00000000-0000-4000-8000-000000000002', operation: 'READ' as const };
  try {
    await controller.authorize(documentKey, request);
    await controller.authorize(documentKey, { ...request, operation: 'EDIT_DOCUMENTS' });
    await controller.authorize(communicationKey, request);
    await assert.rejects(controller.authorize(communicationKey, { ...request, operation: 'EDIT_DOCUMENTS' }));
    for (const key of ['', 'incorrect', process.env.INTERNAL_SERVICE_KEY!]) await assert.rejects(controller.authorize(key, request));
    assert.equal(authorizations, 3);
  } finally {
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
});
