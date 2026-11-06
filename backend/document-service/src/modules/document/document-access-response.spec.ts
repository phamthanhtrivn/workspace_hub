import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentController } from './document.controller';
import type { DocumentService } from './document.service';
import { DocumentRole } from '../../common/enums/document.enum';

for (const role of [
  DocumentRole.OWNER,
  DocumentRole.EDITOR,
  DocumentRole.VIEWER,
]) {
  void test(`document access exposes the verified ${role} role for UI capabilities`, async () => {
    const identityChecks: string[][] = [];
    const service = {
      checkPermission: (id: string, userId: string, email: string) => {
        identityChecks.push([id, userId, email]);
        return Promise.resolve({
          id,
          name: 'Folder',
          type: 'FOLDER',
          sizeBytes: 0n,
          mimeType: null,
          s3Key: 'private-key',
        });
      },
      getPermissionRole: (id: string, userId: string, email: string) => {
        identityChecks.push([id, userId, email]);
        return Promise.resolve(role);
      },
    };
    const controller = new DocumentController(
      service as unknown as DocumentService,
    );
    const response = await controller.getAccessibleItem(
      'viewer',
      'test@example.invalid',
      'folder',
    );
    assert.equal(response.data.userRole, role);
    assert.equal(response.data.id, 'folder');
    assert.deepEqual(identityChecks, [
      ['folder', 'viewer', 'test@example.invalid'],
      ['folder', 'viewer', 'test@example.invalid'],
    ]);
    assert.equal(
      Object.prototype.hasOwnProperty.call(response.data, 's3Key'),
      false,
    );
  });
}
