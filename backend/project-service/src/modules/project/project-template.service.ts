import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectTemplate, TaskPriority, TaskStatus, TaskType } from './project.enums';

interface TemplateTask {
  title: string;
  children: string[];
}

const TEMPLATES: Record<Exclude<ProjectTemplate, ProjectTemplate.EMPTY>, TemplateTask[]> = {
  [ProjectTemplate.SOFTWARE_SCRUM]: [
    { title: 'Define product backlog', children: ['Write user stories', 'Prioritize MVP scope'] },
    { title: 'Build first increment', children: ['Implement core flow', 'Review with team'] },
    { title: 'Quality and release', children: ['Prepare test plan', 'Create release notes'] },
  ],
  [ProjectTemplate.MARKETING_CAMPAIGN]: [
    { title: 'Campaign goals', children: ['Define audience', 'Set success metrics'] },
    { title: 'Content production', children: ['Create content calendar', 'Review campaign assets'] },
    { title: 'Launch and measure', children: ['Publish campaign', 'Track performance'] },
  ],
  [ProjectTemplate.EVENT_PLAN]: [
    { title: 'Event objectives', children: ['Confirm target audience', 'Define event scope'] },
    { title: 'Event preparation', children: ['Book venue and vendors', 'Prepare communication plan'] },
    { title: 'Event execution', children: ['Run event checklist', 'Collect feedback'] },
  ],
};

@Injectable()
export class ProjectTemplateService {
  async initialize(
    database: Prisma.TransactionClient,
    projectId: string,
    userId: string,
    template: ProjectTemplate,
    now: Date,
  ): Promise<void> {
    if (template === ProjectTemplate.EMPTY) return;

    for (const [rootIndex, root] of TEMPLATES[template].entries()) {
      const parentNumber = await this.allocateTaskNumber(database, projectId);
      const parent = await database.task.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          taskNumber: parentNumber,
          taskType: TaskType.EPIC,
          title: root.title,
          description: 'Sample task from project template.',
          priority: rootIndex === 0 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          createdBy: userId,
          reporterId: userId,
          allDay: false,
          estimatedMinutes: 180,
          rank: String((rootIndex + 1) * 1000),
          archived: false,
          isParentTask: true,
          autoCompleteSprint: false,
          createdAt: now,
          updatedAt: now,
        },
      });

      for (const [childIndex, title] of root.children.entries()) {
        const childNumber = await this.allocateTaskNumber(database, projectId);
        const child = await database.task.create({
          data: {
            id: crypto.randomUUID(),
            projectId,
            parentTaskId: parent.id,
            taskNumber: childNumber,
            taskType: TaskType.SUBTASK,
            title,
            description: 'Sample subtask from project template.',
            priority: TaskPriority.MEDIUM,
            status: TaskStatus.TODO,
            createdBy: userId,
            reporterId: userId,
            allDay: false,
            estimatedMinutes: 60,
            rank: String((childIndex + 1) * 100),
            archived: false,
            isParentTask: false,
            autoCompleteSprint: false,
            createdAt: now,
            updatedAt: now,
          },
        });
        await this.createChecklist(database, child.id, now, [
          'Define work scope',
          'Update execution result',
        ]);
      }

      await this.createChecklist(database, parent.id, now, [
        'Review task objective',
        'Confirm completion',
      ]);
    }
  }

  private async createChecklist(
    database: Prisma.TransactionClient,
    taskId: string,
    now: Date,
    titles: string[],
  ): Promise<void> {
    await database.taskChecklist.createMany({
      data: titles.map((title, index) => ({
        id: crypto.randomUUID(),
        taskId,
        title,
        completed: false,
        createdAt: now,
        rank: String(index + 1).padStart(3, '0'),
      })),
    });
  }

  private async allocateTaskNumber(
    database: Prisma.TransactionClient,
    projectId: string,
  ): Promise<number> {
    const project = await database.project.update({
      where: { id: projectId },
      data: { nextTaskNumber: { increment: 1 } },
      select: { nextTaskNumber: true },
    });
    return project.nextTaskNumber - 1;
  }
}
