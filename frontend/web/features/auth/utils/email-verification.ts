import { EMAIL_VERIFICATION } from "../types/email-verification.constants";

export const emailVerificationDeliveryKey = (email: string) =>
  [EMAIL_VERIFICATION.deliveryQueryKey, email.trim().toLowerCase()] as const;

export const getEmailVerificationPath = (email: string) =>
  `${EMAIL_VERIFICATION.page}?email=${encodeURIComponent(email.trim().toLowerCase())}`;

export const getVerificationCooldown = (requestedAt: number, now = Date.now()) =>
  Math.max(0, Math.ceil((requestedAt + EMAIL_VERIFICATION.resendDelaySeconds * 1000 - now) / 1000));
