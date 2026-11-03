export const EMAIL_VERIFICATION = {
  page: "/verify-email",
  send: "/api/auth/verification/send",
  confirm: "/api/auth/verification/confirm",
  resendDelaySeconds: 60,
} as const;
