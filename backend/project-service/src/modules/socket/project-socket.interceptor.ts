import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthenticatedRequest } from '../../common/guards/jwt-identity.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ProjectChangeAction,
  ProjectChangedEvent,
  ProjectResource,
} from './project-socket.types';
import { ProjectSocketPublisher } from './project-socket.publisher';

interface MutationLocation {
  projectId?: string;
  taskId?: string;
  invitedUserId?: string;
}

interface ApiResult {
  data?: { id?: string; projectId?: string; taskId?: string; invitedUserId?: string } | null;
}

interface MutationBody {
  userId?: unknown;
  invitedUserId?: unknown;
  taskIds?: unknown;
}

@Injectable()
export class ProjectSocketInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketPublisher: ProjectSocketPublisher,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const resource = this.resourceFrom(request);
    const action = this.actionFrom(request.method);
    if (!resource || !action || !request.authenticatedUserId) return next.handle();

    const location = await this.resolveLocation(request);
    return next.handle().pipe(
      tap((result: ApiResult) => {
        const projectId = location.projectId ?? result?.data?.projectId ?? result?.data?.id;
        if (!projectId) return;

        const event: ProjectChangedEvent = {
          projectId,
          resource,
          action,
          actorId: request.authenticatedUserId!,
          entityId: result?.data?.id ?? this.entityId(request),
          taskId: location.taskId ?? result?.data?.taskId,
          taskIds: this.taskIds(request),
          data: result?.data ?? undefined,
          occurredAt: new Date().toISOString(),
        };
        this.socketPublisher.publish(event, this.targetUsers(request, location, resource, action));
      }),
    );
  }

  private async resolveLocation(request: Request): Promise<MutationLocation> {
    const params = request.params as Record<string, string | undefined>;

    try {
      if (params.invitationId) {
        const invitation = await this.prisma.projectInvitation.findUnique({
          where: { id: params.invitationId },
          select: { projectId: true, invitedUserId: true },
        });
        return {
          projectId: invitation?.projectId ?? params.projectId,
          invitedUserId: invitation?.invitedUserId,
        };
      }
      if (params.projectId) {
        return { projectId: params.projectId, taskId: params.taskId };
      }
      const taskId = params.taskId ?? params.successorTaskId;
      if (taskId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
        return { projectId: task?.projectId, taskId };
      }
      if (params.checklistId) {
        const item = await this.prisma.taskChecklist.findUnique({
          where: { id: params.checklistId },
          select: { taskId: true, task: { select: { projectId: true } } },
        });
        return { projectId: item?.task.projectId, taskId: item?.taskId };
      }
      if (params.commentId) {
        const comment = await this.prisma.taskComment.findUnique({
          where: { id: params.commentId },
          select: { taskId: true, task: { select: { projectId: true } } },
        });
        return { projectId: comment?.task.projectId, taskId: comment?.taskId };
      }
      if (params.labelId) {
        const label = await this.prisma.taskLabel.findUnique({ where: { id: params.labelId }, select: { projectId: true } });
        return { projectId: label?.projectId };
      }
    } catch {
      return {};
    }
    return {};
  }

  private resourceFrom(request: Request): ProjectResource | undefined {
    const path = request.originalUrl.split('?')[0];
    if (path.includes('/invitations') || path.includes('/project-invitations')) {
      return 'INVITATION';
    }
    if (path.includes('/members')) return 'MEMBER';
    if (path.includes('/files')) return 'FILE';
    if (path.includes('/checklists')) return 'CHECKLIST';
    if (path.includes('/task-comments') || path.includes('/comments')) return 'COMMENT';
    if (path.includes('/dependencies')) return 'DEPENDENCY';
    if (path.includes('/labels')) return 'LABEL';
    if (path.includes('/sprints')) return 'SPRINT';
    if (path.includes('/tasks')) return 'TASK';
    if (path.includes('/projects')) return 'PROJECT';
    return undefined;
  }

  private actionFrom(method: string): ProjectChangeAction | undefined {
    if (method === 'POST') return 'CREATED';
    if (method === 'PATCH' || method === 'PUT') return 'UPDATED';
    if (method === 'DELETE') return 'DELETED';
    return undefined;
  }

  private entityId(request: Request): string | undefined {
    const params = request.params as Record<string, string | undefined>;
    return params.taskId ?? params.successorTaskId ?? params.sprintId ?? params.checklistId
      ?? params.commentId ?? params.labelId ?? params.invitationId ?? params.fileId ?? params.memberUserId;
  }

  private targetUsers(
    request: AuthenticatedRequest,
    location: MutationLocation,
    resource: ProjectResource,
    action: ProjectChangeAction,
  ): string[] {
    if (resource === 'PROJECT') return action === 'CREATED' ? [request.authenticatedUserId!] : [];
    if (resource !== 'MEMBER' && resource !== 'INVITATION') return [];

    const body = request.body as MutationBody | undefined;
    const params = request.params as Record<string, string | undefined>;
    return [body?.userId, body?.invitedUserId, params.memberUserId, location.invitedUserId]
      .filter((value): value is string => typeof value === 'string');
  }

  private taskIds(request: Request): string[] | undefined {
    const values = (request.body as MutationBody | undefined)?.taskIds;
    if (!Array.isArray(values)) return undefined;
    const taskIds = values.filter((value): value is string => typeof value === 'string');
    return taskIds.length > 0 ? taskIds : undefined;
  }
}
