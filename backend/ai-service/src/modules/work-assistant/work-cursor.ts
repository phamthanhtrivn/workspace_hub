import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

const cursorSchema = z
  .object({
    id: z.string().uuid(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export function conversationCursor(id: string, updatedAt: string | Date) {
  return Buffer.from(
    JSON.stringify({
      id,
      updatedAt:
        updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    }),
  ).toString("base64url");
}

export function parseConversationCursor(value: string): {
  id: string;
  updatedAt?: string;
} {
  // Accept cursors issued before timestamp boundaries were introduced.
  if (z.string().uuid().safeParse(value).success) return { id: value };
  try {
    if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value))
      throw new Error();
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    throw new BadRequestException("Invalid conversation cursor");
  }
}
