import { ProjectAccessSyncWorker } from './project-access-sync.worker';

describe('Project access durable synchronization', () => {
  function setup(claimed = 1) {
    const job = { projectId: 'project', revision: 4n, documentStatus: 'PENDING', chatStatus: 'PENDING', attemptCount: 0, nextAttemptAt: new Date(0) };
    const prisma = { projectAccessSyncJob: { findMany: jest.fn().mockResolvedValue([job]), updateMany: jest.fn().mockResolvedValue({ count: claimed }) } };
    const projects = { syncProjectDocumentAccess: jest.fn().mockResolvedValue({}), syncProjectSpaceAccess: jest.fn().mockResolvedValue({ exists: false }) };
    return { prisma, projects, worker: new ProjectAccessSyncWorker(prisma as any, projects as any) };
  }
  it('keeps document failures retryable without creating a project chat', async () => {
    const { worker, prisma, projects } = setup(); projects.syncProjectDocumentAccess.mockRejectedValue(new Error('Unavailable'));
    await worker.drain();
    expect(prisma.projectAccessSyncJob.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { projectId: 'project', revision: 4n }, data: expect.objectContaining({ documentStatus: 'FAILED', chatStatus: 'NOT_CREATED' }),
    }));
  });
  it('passes the durable revision to both receivers', async () => {
    const { worker, projects } = setup(); await worker.drain();
    expect(projects.syncProjectDocumentAccess).toHaveBeenCalledWith('project', undefined, 4n);
    expect(projects.syncProjectSpaceAccess).toHaveBeenCalledWith('project', undefined, 4n);
  });
  it('does not deliver a superseded or already leased job', async () => {
    const { worker, projects } = setup(0); await worker.drain();
    expect(projects.syncProjectSpaceAccess).not.toHaveBeenCalled(); expect(projects.syncProjectDocumentAccess).not.toHaveBeenCalled();
  });
});
