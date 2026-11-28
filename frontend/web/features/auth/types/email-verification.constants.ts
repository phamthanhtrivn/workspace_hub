export const EMAIL_VERIFICATION = {
  page: "/verify-email",
  send: "/api/auth/verification/send",
  confirm: "/api/auth/verification/confirm",
  resendDelaySeconds: 60,
  deliveryQueryKey: "email-verification-delivery",
  requiredMessage: "Verify your email before signing in.",
  sendFailedMessage: "We could not send a verification code. Try sending it again.",
} as const;

export const EMAIL_VERIFICATION_STEP = { EMAIL: "email", CODE: "code" } as const;
export type EmailVerificationStep = (typeof EMAIL_VERIFICATION_STEP)[keyof typeof EMAIL_VERIFICATION_STEP];

export type EmailVerificationDelivery =
  | { status: "requested"; requestedAt: number }
  | { status: "failed"; message: string };
