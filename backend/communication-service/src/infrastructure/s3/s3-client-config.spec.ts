jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import { S3Service } from './s3.service';

describe('S3 client credentials and compatible storage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AWS_REGION: 'ap-southeast-2',
      AWS_S3_BUCKET_NAME: 'private-test-bucket',
      AWS_ACCESS_KEY_ID: 'provider-key',
      AWS_SECRET_ACCESS_KEY: 'provider-secret',
    };
    delete process.env.AWS_ACCESS_KEY;
    delete process.env.AWS_SECRET_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AWS_S3_ENDPOINT;
    delete process.env.AWS_S3_FORCE_PATH_STYLE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses the default AWS credential provider when custom keys are absent', async () => {
    const service = new S3Service();

    await expect(
      service['s3Client'].config.credentials(),
    ).resolves.toMatchObject({
      accessKeyId: 'provider-key',
      secretAccessKey: 'provider-secret',
    });
  });

  it('uses a complete custom credential pair instead of the default provider', async () => {
    process.env.AWS_ACCESS_KEY = 'custom-key';
    process.env.AWS_SECRET_KEY = 'custom-secret';
    const service = new S3Service();

    await expect(
      service['s3Client'].config.credentials(),
    ).resolves.toMatchObject({
      accessKeyId: 'custom-key',
      secretAccessKey: 'custom-secret',
    });
  });

  it.each(['AWS_ACCESS_KEY', 'AWS_SECRET_KEY'])(
    'uses the default provider when only %s is set',
    async (name) => {
      process.env[name] = 'incomplete-custom-key';
      const service = new S3Service();

      await expect(
        service['s3Client'].config.credentials(),
      ).resolves.toMatchObject({
        accessKeyId: 'provider-key',
        secretAccessKey: 'provider-secret',
      });
    },
  );

  it('retains the custom recording endpoint and path-style addressing', async () => {
    process.env.AWS_S3_ENDPOINT = 'http://127.0.0.1:9000';
    process.env.AWS_S3_FORCE_PATH_STYLE = 'true';
    const service = new S3Service();
    const endpoint = await service['s3Client'].config.endpoint!();

    expect(endpoint).toMatchObject({
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: 9000,
    });
    expect(service['s3Client'].config.forcePathStyle).toBe(true);
  });
});
