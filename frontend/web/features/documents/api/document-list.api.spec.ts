import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DocumentItem } from '../types/documents.types';
import { collectDocumentSelection } from './document-list.api';

test('Select all fetches every page, including results not yet scrolled into view', async () => {
  const pages: number[] = [];
  const result = await collectDocumentSelection(page => {
    pages.push(page);
    return Promise.resolve({ data: [{ id: `file-${page}` } as DocumentItem], meta: { totalItems: 3, page, limit: 1, totalPages: 3 } });
  });
  assert.deepEqual(pages, [1, 2, 3]);
  assert.deepEqual(result.map(item => item.id), ['file-1', 'file-2', 'file-3']);
});

test('failed later pages reject Select all instead of returning a partial selection', async () => {
  await assert.rejects(collectDocumentSelection(page => {
    if (page === 2) return Promise.reject(new Error('network unavailable'));
    return Promise.resolve({ data: [{ id: 'first' } as DocumentItem], meta: { totalItems: 2, page, limit: 1, totalPages: 2 } });
  }));
});
