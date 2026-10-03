import { MessageType } from '@prisma/client';

export function isTaskCardContent(type: MessageType, content: string): boolean {
  if (type === MessageType.TASK) return true;
  if (type !== MessageType.TEXT) return false;

  const trimmed = content.trim();
  if (trimmed.includes('[Task #')) return true;
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;

  try {
    const payload: unknown = JSON.parse(trimmed);
    return (
      typeof payload === 'object' &&
      payload !== null &&
      ('type' in payload && payload.type === 'TASK' ||
        'taskId' in payload && Boolean(payload.taskId))
    );
  } catch {
    return false;
  }
}
