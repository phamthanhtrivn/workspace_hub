import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectSocketInterceptor } from './project-socket.interceptor';
import { ProjectSocketPublisher } from './project-socket.publisher';

describe('ProjectSocketInterceptor', () => {
  it('publishes invitation cancellation to the project and invited user', async () => {
    const invitationId = '59d2c930-239e-428d-a5a4-4361a8de85a7';
    const projectId = 'aa5658c8-24cd-42d8-8722-c3b7add9e50f';
    const invitedUserId = '190d156b-f262-49e3-b575-aab621404b52';
    const actorId = '9d0deeb4-a868-45d9-923e-62feecde6a6e';
    const prisma = {
      projectInvitation: {
        findUnique: jest.fn().mockResolvedValue({ projectId, invitedUserId }),
      },
    } as unknown as PrismaService;
    const publisher = { publish: jest.fn() } as unknown as ProjectSocketPublisher;
    const interceptor = new ProjectSocketInterceptor(prisma, publisher);
    const request = {
      method: 'DELETE',
      originalUrl: `/api/projects/${projectId}/invitations/${invitationId}`,
      params: { projectId, invitationId },
      body: {},
      authenticatedUserId: actorId,
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await lastValueFrom(await interceptor.intercept(context, { handle: () => of({ data: null }) }));

    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, resource: 'INVITATION', action: 'DELETED', actorId }),
      [invitedUserId],
    );
  });
});
