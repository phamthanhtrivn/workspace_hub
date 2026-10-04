import { MessageType } from '@prisma/client';
import { isTaskCardContent } from './is-task-card-content';

describe('isTaskCardContent', () => {
  it('recognizes current, legacy, and typed task cards', () => {
    expect(isTaskCardContent(MessageType.TEXT, '{"type":"TASK","taskId":"task-1"}')).toBe(true);
    expect(isTaskCardContent(MessageType.TEXT, 'Discuss [Task #1234]')).toBe(true);
    expect(isTaskCardContent(MessageType.TASK, 'task-1')).toBe(true);
  });

  it('does not block ordinary text or malformed JSON', () => {
    expect(isTaskCardContent(MessageType.TEXT, 'ordinary message')).toBe(false);
    expect(isTaskCardContent(MessageType.TEXT, '{"type":"TASK"')).toBe(false);
  });
});
