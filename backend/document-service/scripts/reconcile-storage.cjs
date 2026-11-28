const { PrismaClient } = require('@prisma/client');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ quiet: true });

async function main() {
  const prisma = new PrismaClient();
  try {
    const files = await prisma.documentItem.findMany({ where: { type: 'FILE' }, select: { id: true, ownerUserId: true, s3Key: true, sizeBytes: true, versions: { select: { s3Key: true, sizeBytes: true } } } });
    const quotas = await prisma.userStorageQuota.findMany({ select: { userId: true } });
    const owners = new Set([...files.map(file => file.ownerUserId), ...quotas.map(quota => quota.userId)]), references = new Map();
    for (const file of files) {
      for (const key of new Set([file.s3Key, ...file.versions.map(version => version.s3Key)].filter(Boolean))) {
        references.set(key, [...(references.get(key) ?? []), file.id]);
      }
    }
    const report = { mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', usage: [], sharedObjects: [...references].filter(([, ids]) => ids.length > 1).map(([key, documentIds]) => ({ key, documentIds })), missingObjects: [] };
    for (const userId of owners) {
      const owned = files.filter(file => file.ownerUserId === userId);
      const bytes = owned.reduce((total, file) => total + (file.versions.length ? file.versions.reduce((sum, version) => sum + version.sizeBytes, 0n) : file.sizeBytes), 0n);
      const quota = await prisma.userStorageQuota.findUnique({ where: { userId } });
      report.usage.push({ userId, storedBytes: quota?.usedBytes.toString() ?? '0', expectedBytes: bytes.toString() });
      if (report.mode === 'apply') await prisma.$transaction(async tx => {
        await tx.userStorageQuota.upsert({ where: { userId }, create: { userId }, update: {} });
        await tx.$queryRaw`SELECT user_id FROM user_storage_quotas WHERE user_id = ${userId}::uuid FOR UPDATE`;
        const current = await tx.documentItem.findMany({ where: { ownerUserId: userId, type: 'FILE' }, select: { sizeBytes: true, versions: { select: { sizeBytes: true } } } });
        const actual = current.reduce((sum, file) => sum + (file.versions.length ? file.versions.reduce((n, version) => n + version.sizeBytes, 0n) : file.sizeBytes), 0n);
        await tx.userStorageQuota.update({ where: { userId }, data: { usedBytes: actual } });
      });
    }
    if (process.argv.includes('--check-objects')) {
      const storage = new S3Client({ region: process.env.AWS_REGION, credentials: process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY ? { accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_KEY } : undefined });
      for (const [key, documentIds] of references) {
        try { await storage.send(new HeadObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key })); }
        catch (error) { if (error.$metadata?.httpStatusCode === 404) report.missingObjects.push({ key, documentIds }); else throw error; }
      }
    }
    console.log(JSON.stringify(report, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
