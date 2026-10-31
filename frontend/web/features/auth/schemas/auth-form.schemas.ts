import { z } from "zod";
import {
  AUTH_VALIDATION_LIMITS as limits,
  AUTH_VALIDATION_MESSAGES as messages,
} from "../types/auth-validation.constants";
import { getCurrentLocalDate } from "../utils/auth-date";

const emailSchema = z
  .string()
  .trim()
  .min(1, messages.emailRequired)
  .max(limits.emailLength, messages.emailTooLong)
  .regex(z.regexes.html5Email, messages.emailInvalid)
  .toLowerCase();

const passwordBytesValid = (password: string) =>
  new TextEncoder().encode(password).length <= limits.passwordMaxBytes;

const loginPasswordSchema = z
  .string()
  .refine((password) => password.trim().length > 0, messages.passwordRequired)
  .refine(passwordBytesValid, messages.passwordBytes);

const newPasswordSchema = z
  .string()
  .min(1, messages.passwordRequired)
  .min(limits.passwordMinLength, messages.passwordLength)
  .max(limits.passwordMaxLength, messages.passwordLength)
  // Java's PASSWORD_PATTERN counts Unicode code points; @Size also bounds UTF-16 length.
  .refine(
    (password) => Array.from(password).length >= limits.passwordMinLength,
    messages.passwordLength,
  )
  .refine(passwordBytesValid, messages.passwordBytes)
  .refine(
    (password) =>
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[\p{P}\p{S}]/u.test(password),
    messages.passwordComplexity,
  )
  // Mirrors Java Pattern's default \S rather than silently broadening the backend policy.
  .regex(/^[^\t\n\v\f\r ]*$/u, messages.passwordWhitespace);

const confirmPasswordSchema = z.string().min(1, messages.confirmRequired);
const optionalBirthDateSchema = z
  .union([z.literal(""), z.iso.date({ error: messages.dobInvalid })], {
    error: messages.dobInvalid,
  })
  .refine((value) => !value || value < getCurrentLocalDate(), messages.dobPast);

export const loginFormSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registerFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .max(limits.fullNameLength, messages.nameTooLong),
    dob: optionalBirthDateSchema,
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: messages.passwordMismatch,
  });

export const forgotEmailFormSchema = z.object({ email: emailSchema });
export const verifyOtpFormSchema = z.object({
  otp: z
    .string()
    .min(1, messages.otpRequired)
    .regex(new RegExp(`^[0-9]{${limits.otpLength}}$`), messages.otpInvalid),
});
export const resetPasswordFormSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: messages.passwordMismatch,
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ForgotEmailFormValues = z.infer<typeof forgotEmailFormSchema>;
export type VerifyOtpFormValues = z.infer<typeof verifyOtpFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
