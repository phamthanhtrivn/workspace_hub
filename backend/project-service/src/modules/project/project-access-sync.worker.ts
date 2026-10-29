import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectService } from './project.service';
import { ACCESS_SYNC_INTERVAL_MS, ACCESS_SYNC_MAX_BACKOFF_MS, AccessSyncStatus } from './project-access-sync';

const SYNC_LEASE_MS = 60_000;
@Injectable()
export class ProjectAccessSyncWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(ProjectAccessSyncWorker.name);
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectService) {}
  onModuleInit() {
    void this.reconcile().catch(error => this.logger.error(error));
    this.timer = setInterval(() => void this.drain().catch(error => this.logger.error(error)), ACCESS_SYNC_INTERVAL_MS);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async reconcile() {
    const projects = await this.prisma.project.findMany({ select: { id: true } });
    await this.prisma.projectAccessSyncJob.createMany({ data: projects.map(project => ({ projectId: project.id })), skipDuplicates: true });
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await this.prisma.projectAccessSyncJob.findMany({ where: {
        nextAttemptAt: { lte: new Date() }, OR: [ { documentStatus: { in: [AccessSyncStatus.PENDING, AccessSyncStatus.FAILED] } }, { chatStatus: { in: [AccessSyncStatus.PENDING, AccessSyncStatus.FAILED] } } ],
      }, orderBy: { nextAttemptAt: 'asc' }, take: 20 });
      if (jobs.length) this.logger.debug(`Project access backlog batch=${jobs.length} oldestDelayMs=${Math.max(0, Date.now() - jobs[0].nextAttemptAt.getTime())}`);
      for (const job of jobs) {
        const claimed = await this.prisma.projectAccessSyncJob.updateMany({ where: { projectId: job.projectId, revision: job.revision, nextAttemptAt: { lte: new Date() } }, data: { nextAttemptAt: new Date(Date.now() + SYNC_LEASE_MS) } });
        if (!claimed.count) continue;
        let documentStatus = job.documentStatus, chatStatus = job.chatStatus;
        const failures: string[] = [];
        try { await this.projects.syncProjectDocumentAccess(job.projectId, undefined, job.revision); documentStatus = AccessSyncStatus.READY; }
        catch { documentStatus = AccessSyncStatus.FAILED; failures.push('Documents are still being prepared'); }
        try { const result = await this.projects.syncProjectSpaceAccess(job.projectId, undefined, job.revision); chatStatus = result && 'exists' in result && !result.exists ? AccessSyncStatus.NOT_CREATED : AccessSyncStatus.READY; }
        catch { chatStatus = AccessSyncStatus.FAILED; failures.push('Chat access is still being prepared'); }
        await this.prisma.projectAccessSyncJob.updateMany({ where: { projectId: job.projectId, revision: job.revision }, data: {
          documentStatus, chatStatus, attemptCount: { increment: 1 }, lastError: failures.join('. ') || null,
          nextAttemptAt: new Date(Date.now() + Math.min(ACCESS_SYNC_MAX_BACKOFF_MS, ACCESS_SYNC_INTERVAL_MS * 2 ** Math.min(job.attemptCount, 7))),
        } });
        if (failures.length) this.logger.warn(`Project access ${job.projectId} revision ${job.revision}: ${failures.join('; ')}`);
      }
    } finally { this.running = false; }
  }
}
