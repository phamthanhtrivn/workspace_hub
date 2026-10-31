import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { getAuthErrorMessage, getAuthValidationErrors } from "./auth-error";

export function handleAuthFormError<Values extends FieldValues>(
  error: unknown,
  form: UseFormReturn<Values>,
  fields: readonly Path<Values>[],
  fallback: string,
) {
  const errors = getAuthValidationErrors(error);
  const invalidFields = fields.filter((field) => Boolean(errors[field]));
  for (const field of invalidFields)
    form.setError(field, { type: "server", message: errors[field] });
  const firstInvalid = invalidFields[0];
  // The request guard disables inputs until handleSubmit settles; focus after that render.
  if (firstInvalid) requestAnimationFrame(() => form.setFocus(firstInvalid));

  const unknownError = Object.entries(errors).find(
    ([field]) => !fields.some((visible) => visible === field),
  );
  if (!invalidFields.length || unknownError) {
    const message = unknownError?.[1] ?? getAuthErrorMessage(error, fallback);
    form.setError("root.server", { type: "server", message });
    toast.error(message);
  }
}
