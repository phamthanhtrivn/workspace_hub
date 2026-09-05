import { Prisma } from '@prisma/client';

export const taskInclude = {
  _count: { select: { children: { where: { archived: false, deletedAt: null } } } },
  checklists: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
  assignees: { orderBy: { assignedAt: 'asc' } },
  labelMappings: { include: { label: true }, orderBy: { labelId: 'asc' } },
} satisfies Prisma.TaskInclude;
