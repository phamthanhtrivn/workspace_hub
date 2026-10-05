import { Test, TestingModule } from '@nestjs/testing';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/client-s3', () => ({
  ...jest.requireActual<typeof import('@aws-sdk/client-s3')>(
    '@aws-sdk/client-s3',
  ),
  S3Client: jest.fn().mockImplementation(() => ({})),
}));

describe('S3Service', () => {
  let service: S3Service;
  let originalEnvironment: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnvironment = { ...process.env };
    delete process.env.AWS_ACCESS_KEY;
    delete process.env.AWS_SECRET_KEY;
    process.env.AWS_REGION = 'ap-southeast-1';
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses the SDK credential chain for the EC2 instance role', () => {
    expect(S3Client).toHaveBeenCalledWith({
      region: 'ap-southeast-1',
      credentials: undefined,
    });
  });

  it('preserves explicitly configured local credentials', () => {
    process.env.AWS_ACCESS_KEY = 'test-local-key';
    process.env.AWS_SECRET_KEY = 'test-local-secret';
    new S3Service();
    expect(S3Client).toHaveBeenLastCalledWith({
      region: 'ap-southeast-1',
      credentials: {
        accessKeyId: 'test-local-key',
        secretAccessKey: 'test-local-secret',
      },
    });
  });
});
