const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ quiet: true });

async function main() {
  const prisma = new PrismaClient();
  try {
    const projects = await prisma.project.findMany({ select: { id: true } });
    const apply = process.argv.includes('--apply');
    if (apply) for (const project of projects) await prisma.projectAccessSyncJob.upsert({
      where: { projectId: project.id }, create: { projectId: project.id },
      update: { revision: { increment: 1 }, documentStatus: 'PENDING', chatStatus: 'PENDING', nextAttemptAt: new Date(), attemptCount: 0, lastError: null },
    });
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectIds: projects.map(project => project.id) }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
