import type { FormEvent } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { handleAuthFormError } from "../utils/auth-form-error";
import type { AuthAction } from "../types/auth-activity.constants";
import { useAuthInteraction } from "../components/auth-interaction-provider";

export function useAuthFormSubmit<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  fields: readonly Path<Values>[],
  fallback: string,
  submit: (values: Values) => Promise<void>,
  action: AuthAction,
) {
  const { begin, complete, fail } = useAuthInteraction();
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!begin(action)) return;
    return form.handleSubmit(async (values) => {
      form.clearErrors("root");
      try {
        await submit(values);
        complete(action);
      } catch (error) {
        fail(action);
        handleAuthFormError(error, form, fields, fallback);
      }
    }, () => fail(action))(event).catch((error: unknown) => {
      fail(action);
      handleAuthFormError(error, form, fields, fallback);
    });
  };
}
