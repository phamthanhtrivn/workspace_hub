import { BadRequestException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
export function assertClientMessageType(
  type: MessageType = MessageType.TEXT,
  allowSystem = false,
) {
  if (
    !Object.values(MessageType).includes(type) ||
    type === MessageType.AI ||
    (!allowSystem && type === MessageType.SYSTEM)
  ) {
    throw new BadRequestException('Loại tin nhắn này chỉ dành cho hệ thống.');
  }
}
