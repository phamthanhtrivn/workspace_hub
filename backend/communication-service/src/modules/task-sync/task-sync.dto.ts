import {
  Equals,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class TaskSyncEventDto {
  @Equals(1) schemaVersion!: 1;
  @IsUUID() taskId!: string;
  @IsUUID() projectId!: string;
  @Matches(/^(0|[1-9]\d{0,18})$/) version!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
  status!: string;
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority!: string;
  @IsOptional() @IsDateString() dueDate!: string | null;
  @IsBoolean() deleted!: boolean;
}

export function taskCardSnapshot(event: TaskSyncEventDto) {
  return {
    type: 'TASK',
    taskId: event.taskId,
    projectId: event.projectId,
    title: event.title,
    status: event.status,
    priority: event.priority,
    dueDate: event.dueDate ?? null,
    deleted: event.deleted,
    taskVersion: event.version,
    tag: `[Task #${event.taskId.slice(0, 8)}]`,
  };
}

export function matchesTaskCard(
  content: string | null,
  taskId: string,
): boolean {
  if (!content) return false;
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'taskId' in parsed) {
      return parsed.taskId === taskId;
    }
  } catch {
    /* Legacy task cards use a text tag instead of JSON. */
  }
  return content.includes(`[Task #${taskId.slice(0, 8)}]`);
}
