/* eslint-disable @typescript-eslint/require-await -- Promise-returning test doubles mirror storage and Prisma contracts without external I/O. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectDocumentAttachmentService } from './project-document-attachment.service';

void test('shared files copy into an authorized Project once; retry survives original deletion without charging quota again', async (context) => {
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
  let allow = true,
    writes = 0,
    charged = 0,
    originalAvailable = true,
    copied: unknown;
  context.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options: RequestInit) => {
      assert.equal(typeof options.body, 'string');
      const request = JSON.parse(options.body as string) as {
        operation: string;
      };
      assert.equal(request.operation, 'EDIT_DOCUMENTS');

      return allow
        ? Response.json({ owner: false, canEditDocuments: true })
        : new Response(null, { status: 403 });
    },
  );
  const source = {
    id: 'source',
    name: 'file.txt',
    projectId: null,
    ownerUserId: 'another-user',
    type: 'FILE',
    isArchived: false,
    s3Key: 'original',
    mimeType: 'text/plain',
    sizeBytes: 10n,
  };
  const tx = {
    $queryRaw: async () => [],
    documentItem: {
      findUnique: async () => copied,
      create: async ({ data }: { data: object }) =>
        (copied = { ...source, ...data, id: 'project-copy' }),
    },
  };
  const service = new ProjectDocumentAttachmentService(
    {
      ...tx,
      documentVersion: {
        findFirst: async () => ({
          id: 'version',
          s3Key: 'original',
          sizeBytes: 10n,
        }),
      },
      $transaction: async (run: (transaction: unknown) => unknown) => run(tx),
    } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[0],
    {
      copyFile: async () => {
        writes++;

        return 'independent/project-copy';
      },
      assertUploadSize: async () => {},
    } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[1],
    { enqueue: async () => {} } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[2],
    {
      reserve: async () => {
        charged++;
      },
    } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[3],
    {
      checkPermission: async () => {
        if (!originalAvailable) throw Error('Original removed');

        return source;
      },
    } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[4],
    {
      findProjectRootFolder: async () => ({ id: 'root' }),
      getAvailableImportName: async () => source.name,
      lockAvailableName: async () => {},
    } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[5],
    {
      publishProjectDocumentEvent: async () => {},
    } as unknown as ConstructorParameters<
      typeof ProjectDocumentAttachmentService
    >[6],
    {} as ConstructorParameters<typeof ProjectDocumentAttachmentService>[7],
  );
  const first = await service.importTaskAttachmentDocuments(
    'viewer',
    'viewer@example.invalid',
    'project',
    ['source'],
    'op',
    { source: 'version' },
  );
  assert.equal(first[0].id, 'project-copy');
  originalAvailable = false;
  const retry = await service.importTaskAttachmentDocuments(
    'viewer',
    'viewer@example.invalid',
    'project',
    ['source'],
    'op',
    { source: 'version' },
  );
  assert.equal(retry[0].alreadyAdded, true);
  assert.equal(writes, 1);
  assert.equal(charged, 1);
  allow = false;
  await assert.rejects(
    service.importTaskAttachmentDocuments(
      'viewer',
      'viewer@example.invalid',
      'project',
      ['source'],
      'op',
      { source: 'version' },
    ),
    /access denied/,
  );
  assert.equal(writes, 1);
});
