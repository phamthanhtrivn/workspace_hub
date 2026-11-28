/* eslint-disable @typescript-eslint/require-await -- Promise-returning test doubles mirror storage and Prisma contracts without external I/O. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentPickerService } from './document-picker.service';
import { DocumentPickerQuery } from './dto/document-picker.dto';

void test('personal picker paginates all owned personal files, including starred files, without per-file permission calls', async () => {
  const queries: { where: object; skip: number; take: number }[] = [];
  const files = Array.from({ length: 127 }, (_, index) => ({
    id: String(index),
    ownerUserId: 'owner',
    isStarred: index % 2 === 0,
    versions: [{ id: `version-${index}` }],
  }));
  const service = new DocumentPickerService(
    {
      documentItem: {
        count: async () => files.length,
        findMany: async (query: {
          where: object;
          skip: number;
          take: number;
        }) => {
          queries.push(query);

          return files.slice(query.skip, query.skip + query.take);
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentPickerService>[0],
    {} as ConstructorParameters<typeof DocumentPickerService>[1],
    {
      enrichDocumentItems: async (rows: object[]) => rows,
    } as unknown as ConstructorParameters<typeof DocumentPickerService>[2],
  );
  const response = await service.list(
    'owner',
    'owner@example.invalid',
    Object.assign(new DocumentPickerQuery(), { scope: 'personal', page: 10 }),
  );
  assert.equal(response.meta.totalItems, 127);
  assert.equal(response.data.length, 12);
  assert.equal(response.data[0].versionId, 'version-108');
  assert.equal(
    (queries[0].where as { ownerUserId: string }).ownerUserId,
    'owner',
  );
  assert.equal((queries[0].where as { projectId: unknown }).projectId, null);
  assert.equal('isStarred' in queries[0].where, false);
});
void test('shared root checks authoritative membership once per project and never matches another bound account by email', async (context) => {
  const previous = {
    url: process.env.PROJECT_SERVICE_URL,
    key: process.env.DOCUMENT_TO_PROJECT_KEY,
  };
  process.env.PROJECT_SERVICE_URL = 'http://project.invalid';
  process.env.DOCUMENT_TO_PROJECT_KEY = 'fixture';
  context.after(() => {
    if (previous.url === undefined) delete process.env.PROJECT_SERVICE_URL;
    else process.env.PROJECT_SERVICE_URL = previous.url;
    if (previous.key === undefined) delete process.env.DOCUMENT_TO_PROJECT_KEY;
    else process.env.DOCUMENT_TO_PROJECT_KEY = previous.key;
  });
  let checks = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    checks++;

    return new Response(null, { status: 403 });
  });
  const files = [
    {
      id: 'one',
      ownerUserId: 'other',
      projectId: 'removed-project',
      versions: [],
    },
    {
      id: 'two',
      ownerUserId: 'other',
      projectId: 'removed-project',
      versions: [],
    },
    { id: 'personal', ownerUserId: 'other', projectId: null, versions: [] },
  ];
  const service = new DocumentPickerService(
    {
      documentItem: {
        findMany: async ({
          where,
        }: {
          where: {
            shares: { some: { OR: { shareWithUserId: string | null }[] } };
          };
        }) => {
          assert.equal(where.shares.some.OR[1].shareWithUserId, null);

          return files;
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentPickerService>[0],
    {} as ConstructorParameters<typeof DocumentPickerService>[1],
    {
      enrichDocumentItems: async (rows: object[]) => rows,
    } as unknown as ConstructorParameters<typeof DocumentPickerService>[2],
  );
  const response = await service.list(
    'viewer',
    'viewer@example.invalid',
    Object.assign(new DocumentPickerQuery(), { scope: 'shared' }),
  );
  assert.equal(checks, 1);
  assert.deepEqual(
    response.data.map((file) => file.id),
    ['personal'],
  );
  assert.equal(response.meta.totalItems, 1);
});
