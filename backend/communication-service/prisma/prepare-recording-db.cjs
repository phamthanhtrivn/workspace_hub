const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ quiet: true });

async function prepare() {
  const prisma = new PrismaClient();
  try {
    // This development stack historically uses db push; older migrations do not rebuild a clean database.
    const tables =
      await prisma.$queryRaw`SELECT to_regclass('meeting_recordings')::text AS name`;
    if (tables[0].name) {
      const columns =
        await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'meeting_recordings' AND column_name = 'owner_id'`;
      if (!columns.length) {
        const sql = readFileSync(
          join(
            __dirname,
            'migrations/20261009000100_meeting_recording/migration.sql',
          ),
          'utf8',
        );
        await prisma.$transaction(async (tx) => {
          for (const statement of sql
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean))
            await tx.$executeRawUnsafe(statement);
        });
        console.log(
          'Recording metadata upgraded without losing existing recordings',
        );
      }
    }
    const pushed = spawnSync(
      process.execPath,
      [join(__dirname, '../node_modules/prisma/build/index.js'), 'db', 'push'],
      { stdio: 'inherit' },
    );
    if (pushed.status !== 0)
      throw new Error(
        'Schema update failed; review Prisma output before continuing',
      );
    await prisma.$executeRawUnsafe(
      readFileSync(join(__dirname, 'recording-constraints.sql'), 'utf8'),
    );
    console.log(
      'Recording schema and exclusive recording constraint are ready',
    );
  } finally {
    await prisma.$disconnect();
  }
}

prepare().catch(() => {
  console.error(
    'Could not prepare recording database. Check connectivity, schema drift and existing active recordings.',
  );
  process.exitCode = 1;
});
