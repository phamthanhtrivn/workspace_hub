import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { loadServiceEnvironment } from './load-service-env';

describe('runtime and Prisma environment precedence', () => {
  const fixtureName = 'WORKSPACE_ENV_FIXTURE';
  let directory: string;
  let originalMode: string | undefined;
  let originalFixture: string | undefined;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'workspace-env-'));
    originalMode = process.env.NODE_ENV;
    originalFixture = process.env[fixtureName];
    delete process.env[fixtureName];
    writeFileSync(join(directory, '.env'), `${fixtureName}=base\n`);
    writeFileSync(join(directory, '.env.local'), `${fixtureName}=local\n`);
  });
  afterEach(() => {
    if (originalMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalMode;
    if (originalFixture === undefined) delete process.env[fixtureName];
    else process.env[fixtureName] = originalFixture;
    if (dirname(directory) !== tmpdir())
      throw new Error('Unexpected fixture directory');
    rmSync(directory, { recursive: true, force: true });
  });
  it('uses .env.local for development exactly as runtime does', () => {
    process.env.NODE_ENV = 'development';
    loadServiceEnvironment(directory);
    expect(process.env[fixtureName]).toBe('local');
  });
  it('preserves injected environment and ignores local overrides in production', () => {
    process.env.NODE_ENV = 'production';
    process.env[fixtureName] = 'injected';
    loadServiceEnvironment(directory);
    expect(process.env[fixtureName]).toBe('injected');
    delete process.env[fixtureName];
    loadServiceEnvironment(directory);
    expect(process.env[fixtureName]).toBe('base');
  });
});
