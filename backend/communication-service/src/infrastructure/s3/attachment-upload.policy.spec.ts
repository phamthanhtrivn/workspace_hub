import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateUploadMetadata,
  validateUploadContent,
} from './attachment-upload.policy';

void test('valid local file names and canonical MIME types pass metadata validation', () => {
  for (const [name, mimeType] of [
    ['Báo cáo.pdf', 'application/pdf'],
    ['image.png', 'image/png'],
    [
      'report.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ['notes.txt', 'text/plain'],
    ['voice.webm', 'audio/webm'],
  ])
    assert.doesNotThrow(() => validateUploadMetadata(name, mimeType));
});

void test('MIME mismatches, unsafe paths and executable attachments remain rejected', () => {
  for (const [name, mimeType] of [
    ['image.png', 'application/pdf'],
    ['report.pdf', 'application/octet-stream'],
    ['../report.pdf', 'application/pdf'],
    ['program.exe', 'application/octet-stream'],
  ])
    assert.throws(() => validateUploadMetadata(name, mimeType));
  assert.throws(() =>
    validateUploadContent(
      Buffer.from('MZ-program'),
      'application/octet-stream',
    ),
  );
  assert.throws(() =>
    validateUploadContent(Buffer.from('not a PDF'), 'application/pdf'),
  );
  assert.doesNotThrow(() =>
    validateUploadContent(Buffer.from('%PDF-1.7'), 'application/pdf'),
  );
});
