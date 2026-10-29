const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// All integration writes are confined to a fresh schema; the application's
// configured schema is never pushed, migrated, or cleaned by this helper.
exports.isolatedPostgres = async function isolatedPostgres(serviceDirectory) {
  require(path.join(serviceDirectory, 'node_modules/dotenv')).config({ path: path.join(serviceDirectory, '.env'), quiet: true });
  const configured = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!configured) throw new Error('Set TEST_DATABASE_URL for PostgreSQL integration tests');
  const url = new URL(configured);
  const schema = `ux_test_${randomUUID().replaceAll('-', '')}`;
  url.searchParams.set('schema', schema);
  url.searchParams.set('connection_limit', '8');
  url.searchParams.set('pool_timeout', '30');
  const { PrismaClient } = require(path.join(serviceDirectory, 'node_modules/@prisma/client'));
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } }, transactionOptions: { maxWait: 15_000, timeout: 30_000 } });
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const cleanup = async () => {
    if (!/^ux_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid isolated test schema');
    try { await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await prisma.$disconnect(); }
  };
  try {
    const result = spawnSync(process.execPath, [path.join(serviceDirectory, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
      cwd: serviceDirectory, env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8', windowsHide: true,
    });
    if (result.status !== 0) throw new Error(`Could not initialize isolated PostgreSQL schema (exit ${result.status})`);
    return { prisma, cleanup };
  } catch (error) { await cleanup(); throw error; }
};
