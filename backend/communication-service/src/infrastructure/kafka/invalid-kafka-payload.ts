import { BadRequestException } from '@nestjs/common';

/** A permanently invalid contract, safe to acknowledge only after quarantine. */
export class InvalidKafkaPayload extends BadRequestException {}
