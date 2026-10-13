import { createServer, IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { mkdtemp, open, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { crc32 } from 'zlib';
import { S3Client } from '@aws-sdk/client-s3';
import {
  RecordingMultipartUploader,
  RecordingUploadState,
} from './recording-multipart-upload';

describe('recording upload against an HTTP S3 protocol fixture', () => {
  it('uploads a 110 MiB file with real SDK checksums, parallel requests and resume', async () => {
    const size = 110 * 1024 * 1024 + 123;
    const directory = await mkdtemp(
      join(process.cwd(), '.recording-upload-test-'),
    );
    const path = join(directory, 'backup.mp4');
    const file = await open(path, 'w');
    await file.truncate(size);
    await file.close();
    let rejectPartFour = true;
    let uploaded = false;
    let uploadToken = '';
    let active = 0;
    let peak = 0;
    const parts = new Map<
      number,
      { size: number; checksum: string; etag: string }
    >();
    const counts = new Map<number, number>();
    let completedParts: number[] = [];
    let saved: RecordingUploadState | undefined;
    const xml = (response: ServerResponse, content: string, status = 200) => {
      response.writeHead(status, { 'Content-Type': 'application/xml' });
      response.end(content);
    };
    const handler = async (
      request: IncomingMessage,
      response: ServerResponse,
    ) => {
      const url = new URL(request.url!, 'http://fixture');
      if (request.method === 'POST' && url.searchParams.has('uploads')) {
        uploadToken = String(
          request.headers['x-amz-meta-recording-upload-token'],
        );
        xml(
          response,
          '<InitiateMultipartUploadResult><Bucket>test-bucket</Bucket><Key>recordings/test.mp4</Key><UploadId>upload</UploadId></InitiateMultipartUploadResult>',
        );
        return;
      }
      if (request.method === 'PUT') {
        const number = Number(url.searchParams.get('partNumber'));
        counts.set(number, (counts.get(number) ?? 0) + 1);
        active += 1;
        peak = Math.max(peak, active);
        let bytes = 0;
        let checksum = 0;
        for await (const chunk of request) {
          const buffer = chunk as Buffer;
          bytes += buffer.length;
          checksum = crc32(buffer, checksum);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        if (number === 4 && rejectPartFour) {
          xml(
            response,
            '<Error><Code>ServiceUnavailable</Code><Message>Retry this part</Message></Error>',
            503,
          );
          return;
        }
        const encoded = Buffer.alloc(4);
        encoded.writeUInt32BE(checksum);
        const crc = encoded.toString('base64');
        if (request.headers['x-amz-checksum-crc32'] !== crc) {
          xml(response, '<Error><Code>BadDigest</Code></Error>', 400);
          return;
        }
        parts.set(number, {
          size: bytes,
          checksum: crc,
          etag: `part-${number}`,
        });
        response.writeHead(200, {
          ETag: `part-${number}`,
          'x-amz-checksum-crc32': crc,
        });
        response.end();
        return;
      }
      if (request.method === 'GET') {
        if (uploaded) {
          xml(response, '<Error><Code>NoSuchUpload</Code></Error>', 404);
          return;
        }
        const listing = [...parts]
          .sort(([a], [b]) => a - b)
          .map(
            ([number, part]) =>
              `<Part><PartNumber>${number}</PartNumber><ETag>${part.etag}</ETag><Size>${part.size}</Size><ChecksumCRC32>${part.checksum}</ChecksumCRC32></Part>`,
          )
          .join('');
        xml(
          response,
          `<ListPartsResult><Bucket>test-bucket</Bucket><Key>recordings/test.mp4</Key><UploadId>upload</UploadId><IsTruncated>false</IsTruncated>${listing}</ListPartsResult>`,
        );
        return;
      }
      if (request.method === 'POST') {
        let body = '';
        for await (const chunk of request) body += (chunk as Buffer).toString();
        completedParts = [
          ...body.matchAll(/<PartNumber>(\d+)<\/PartNumber>/g),
        ].map((match) => Number(match[1]));
        uploaded = true;
        xml(
          response,
          '<CompleteMultipartUploadResult><Location>http://fixture/recordings/test.mp4</Location><Bucket>test-bucket</Bucket><Key>recordings/test.mp4</Key><ETag>complete</ETag></CompleteMultipartUploadResult>',
        );
        return;
      }
      if (request.method === 'HEAD') {
        response.writeHead(
          uploaded ? 200 : 404,
          uploaded
            ? {
                'Content-Length': String(size),
                'x-amz-meta-recording-upload-token': uploadToken,
              }
            : {},
        );
        response.end();
        return;
      }
      response.writeHead(405);
      response.end();
    };
    const server = createServer((request, response) => {
      void handler(request, response).catch(() => {
        response.writeHead(500);
        response.end();
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const client = new S3Client({
      region: 'us-east-1',
      endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      forcePathStyle: true,
      maxAttempts: 1,
      credentials: { accessKeyId: 'fixture', secretAccessKey: 'fixture' },
    });
    process.env.MEETING_RECORDING_UPLOAD_PART_MIB = '5';
    process.env.MEETING_RECORDING_UPLOAD_CONCURRENCY = '3';
    try {
      const uploader = new RecordingMultipartUploader(client, 'test-bucket');
      const checkpoint = (state: RecordingUploadState | null) => {
        saved = state
          ? (JSON.parse(JSON.stringify(state)) as RecordingUploadState)
          : undefined;
        return Promise.resolve();
      };
      await expect(
        uploader.upload(path, 'recordings/test.mp4', {
          onCheckpoint: checkpoint,
        }),
      ).rejects.toThrow();
      expect(saved?.parts.map((part) => part.PartNumber)).toEqual([
        1, 2, 3, 5, 6,
      ]);
      rejectPartFour = false;
      await expect(
        uploader.upload(path, 'recordings/test.mp4', {
          state: saved,
          onCheckpoint: checkpoint,
        }),
      ).resolves.toBe(BigInt(size));
      expect(peak).toBe(3);
      expect(counts.get(1)).toBe(1);
      expect(counts.get(4)).toBe(2);
      expect(counts.get(5)).toBe(1);
      expect(completedParts).toEqual(
        Array.from({ length: 23 }, (_, index) => index + 1),
      );
      expect(
        [...parts.values()].reduce((total, part) => total + part.size, 0),
      ).toBe(size);
      await expect(
        uploader.upload(path, 'recordings/test.mp4', {
          state: saved,
          onCheckpoint: checkpoint,
        }),
      ).resolves.toBe(BigInt(size));
      expect(counts.get(1)).toBe(1);
    } finally {
      delete process.env.MEETING_RECORDING_UPLOAD_PART_MIB;
      delete process.env.MEETING_RECORDING_UPLOAD_CONCURRENCY;
      client.destroy();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await unlink(path);
      await rmdir(directory);
    }
  }, 30_000);
});
