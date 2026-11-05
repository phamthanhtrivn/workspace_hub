import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
export const title = z.string().trim().min(1).max(200);
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestException("Dữ liệu không hợp lệ");
  return result.data;
}
