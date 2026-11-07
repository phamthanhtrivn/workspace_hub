"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useConfirmEmailMutation, useSendEmailVerificationMutation } from "./useAuthMutations";
import { useAuthFormSubmit } from "./use-auth-form-submit";
import { useAuthInteraction } from "../components/auth-interaction-provider";
import { verificationEmailFormSchema, verifyOtpFormSchema, type VerificationEmailFormValues, type VerifyOtpFormValues } from "../schemas/auth-form.schemas";
import { AUTH_ACTION, AUTH_REDIRECT_COPY } from "../types/auth-activity.constants";
import { AuthRouteTarget } from "../types/auth.constants";
import { EMAIL_VERIFICATION, EMAIL_VERIFICATION_STEP, type EmailVerificationDelivery, type EmailVerificationStep } from "../types/email-verification.constants";
import { AUTH_VALIDATION_MESSAGES } from "../types/auth-validation.constants";
import { emailVerificationDeliveryKey, getVerificationCooldown } from "../utils/email-verification";
import { handleAuthFormError } from "../utils/auth-form-error";

export function useEmailVerificationFlow(initialEmail: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [delivery] = useState(() => queryClient.getQueryData<EmailVerificationDelivery>(emailVerificationDeliveryKey(initialEmail)));
  const [step, setStep] = useState<EmailVerificationStep>(delivery?.status === "requested" ? EMAIL_VERIFICATION_STEP.CODE : EMAIL_VERIFICATION_STEP.EMAIL);
  const [email, setEmail] = useState(initialEmail.trim().toLowerCase());
  const [deliveryError, setDeliveryError] = useState(delivery?.status === "failed" ? delivery.message : "");
  const [requestedAt, setRequestedAt] = useState(delivery?.status === "requested" ? delivery.requestedAt : 0);
  const [cooldown, setCooldown] = useState(() => getVerificationCooldown(requestedAt));
  const send = useSendEmailVerificationMutation();
  const confirm = useConfirmEmailMutation();
  const { busy, activity, begin, complete, fail, redirect, isLocked, clear } = useAuthInteraction();
  const emailForm = useForm<VerificationEmailFormValues>({
    shouldFocusError: false,
    resolver: zodResolver(verificationEmailFormSchema), defaultValues: { email: initialEmail },
    mode: "onSubmit", reValidateMode: "onChange",
  });
  const otpForm = useForm<VerifyOtpFormValues>({
    shouldFocusError: false,
    resolver: zodResolver(verifyOtpFormSchema), defaultValues: { otp: "" },
    mode: "onSubmit", reValidateMode: "onChange",
  });
  const draftEmail = useWatch({ control: emailForm.control, name: "email" });
  const emailCooldown = draftEmail.trim().toLowerCase() === email ? cooldown : 0;

  useEffect(() => {
    if (!requestedAt) return;
    const timer = setInterval(() => {
      const remaining = getVerificationCooldown(requestedAt);
      setCooldown(remaining);
      if (!remaining) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [requestedAt]);

  const resetCode = () => {
    otpForm.reset();
    setRequestedAt(Date.now());
    setCooldown(EMAIL_VERIFICATION.resendDelaySeconds);
  };
  const onEmailSubmit = useAuthFormSubmit(emailForm, ["email"], AUTH_VALIDATION_MESSAGES.sendCodeFailed, async (values) => {
    setDeliveryError("");
    const response = await send.mutateAsync(values.email);
    setEmail(values.email);
    resetCode();
    setStep(EMAIL_VERIFICATION_STEP.CODE);
    toast.success(response.message);
  }, AUTH_ACTION.SEND_VERIFICATION_CODE);

  const onCodeSubmit = useAuthFormSubmit(otpForm, ["otp"], AUTH_VALIDATION_MESSAGES.verifyCodeFailed, async (values) => {
    const response = await confirm.mutateAsync({ email, otp: values.otp });
    toast.success(response.message);
    redirect(AUTH_ACTION.VERIFY_EMAIL, AUTH_REDIRECT_COPY.emailVerified);
    router.replace(AuthRouteTarget.LOGIN);
  }, AUTH_ACTION.VERIFY_EMAIL);

  const resendCode = async () => {
    if (cooldown > 0 || !email || !begin(AUTH_ACTION.SEND_VERIFICATION_CODE)) return;
    otpForm.clearErrors();
    try {
      const response = await send.mutateAsync(email);
      resetCode();
      toast.success(response.message);
      complete(AUTH_ACTION.SEND_VERIFICATION_CODE);
    } catch (error) {
      fail(AUTH_ACTION.SEND_VERIFICATION_CODE);
      handleAuthFormError(error, otpForm, [], AUTH_VALIDATION_MESSAGES.sendCodeFailed);
    }
  };

  const changeEmail = () => {
    if (isLocked()) return;
    otpForm.reset();
    emailForm.clearErrors();
    setDeliveryError("");
    clear();
    setStep(EMAIL_VERIFICATION_STEP.EMAIL);
  };

  return {
    step, email, emailForm, otpForm, cooldown, emailCooldown, busy, activity, deliveryError,
    sendingCode: busy && activity?.action === AUTH_ACTION.SEND_VERIFICATION_CODE,
    verifyingEmail: busy && activity?.action === AUTH_ACTION.VERIFY_EMAIL,
    onEmailSubmit, onCodeSubmit, resendCode, changeEmail,
  };
}
