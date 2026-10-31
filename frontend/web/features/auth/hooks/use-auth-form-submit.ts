import { useRef, type FormEvent, type RefObject } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { handleAuthFormError } from "../utils/auth-form-error";

export function useAuthFormSubmit<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  fields: readonly Path<Values>[],
  fallback: string,
  submit: (values: Values) => Promise<void>,
  sharedLock?: RefObject<boolean>,
) {
  const localLock = useRef(false);
  const lock = sharedLock ?? localLock;
  return (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (values) => {
      if (lock.current) return;
      lock.current = true;
      form.clearErrors("root");
      try {
        await submit(values);
      } catch (error) {
        handleAuthFormError(error, form, fields, fallback);
      } finally {
        lock.current = false;
      }
    })(event);
}
