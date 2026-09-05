import { Prisma } from '@prisma/client';

// Serialize changes to a project's task tree and sprint membership.
export async function lockProject(database: Prisma.TransactionClient, projectId: string): Promise<void> {
  await database.$queryRaw`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;
}
