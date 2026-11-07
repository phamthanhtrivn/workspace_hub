import { useEffect, useRef, type FormEvent } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { handleAuthFormError } from "../utils/auth-form-error";
import type { AuthAction } from "../types/auth-activity.constants";
import { useAuthInteraction } from "../components/auth-interaction-provider";

function useAuthSubmitErrorFocus<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  fields: readonly Path<Values>[],
  busy: boolean,
) {
  const { isSubmitting, submitCount } = form.formState;
  const handledSubmission = useRef(0);

  useEffect(() => {
    if (busy || isSubmitting) return;
    if (submitCount === 0) {
      handledSubmission.current = 0;
      return;
    }
    if (handledSubmission.current === submitCount) return;
    handledSubmission.current = submitCount;

    // This runs after the unlocked form has rendered. Use the declared visual
    // order rather than resolver/API error order or field registration timing.
    const firstInvalid = fields.find((field) => form.getFieldState(field).invalid);
    if (firstInvalid) form.setFocus(firstInvalid);
  }, [busy, isSubmitting, submitCount, fields, form]);
}

export function useAuthFormSubmit<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  fields: readonly Path<Values>[],
  fallback: string,
  submit: (values: Values) => Promise<void>,
  action: AuthAction,
) {
  const { busy, begin, complete, fail } = useAuthInteraction();
  useAuthSubmitErrorFocus(form, fields, busy);
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
