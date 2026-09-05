import { ValidateIf } from 'class-validator';

// Unlike IsOptional, an omitted field is allowed but null is still validated.
export function OptionalField(): PropertyDecorator {
  return ValidateIf((_object, value) => value !== undefined);
}
