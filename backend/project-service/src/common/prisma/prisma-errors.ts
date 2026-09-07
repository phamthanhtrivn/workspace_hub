import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function isRecordNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export function rethrowWriteConflict(error: unknown, message: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2025' || error.code === 'P2034')
  ) {
    throw new ConflictException(message);
  }
  throw error;
}
