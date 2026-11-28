import { BadRequestException } from '@nestjs/common';
import { IsUUID, validateSync } from 'class-validator';

export class MessageDeliveryDto {
  @IsUUID()
  clientRequestId!: string;
}

export function parseClientRequestId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const dto = Object.assign(new MessageDeliveryDto(), {
    clientRequestId: value,
  });
  if (validateSync(dto).length) {
    throw new BadRequestException('clientRequestId must be a UUID.');
  }

  return dto.clientRequestId.toLowerCase();
}
