import { timingSafeEqual } from "node:crypto";

export function matchesServiceKey(supplied: unknown, expected: string) {
  if (typeof supplied !== "string") return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}
