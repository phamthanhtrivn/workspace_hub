export const AUTH_VALIDATION_LIMITS = {
  fullNameLength: 100,
  emailLength: 254,
  passwordMinLength: 8,
  passwordMaxLength: 72,
  passwordMaxBytes: 72,
  otpLength: 6,
} as const;

export const AUTH_VALIDATION_MESSAGES = {
  emailRequired: "Email is required",
  emailInvalid: "Email is invalid",
  emailTooLong: "Email must not exceed 254 characters",
  nameRequired: "Full name is required",
  nameTooLong: "Full name must not exceed 100 characters",
  passwordRequired: "Password is required",
  passwordLength: "Password must contain 8 to 72 characters",
  passwordBytes: "Password must not exceed 72 UTF-8 bytes",
  passwordComplexity:
    "Use an uppercase letter, a lowercase letter, a number, and a special character",
  passwordWhitespace: "Password must not contain spaces, tabs, or line breaks",
  confirmRequired: "Confirm your password",
  passwordMismatch: "Passwords do not match",
  dobInvalid: "Choose a valid date of birth",
  dobPast: "Date of birth must be in the past",
  otpRequired: "Verification code is required",
  otpInvalid: "Verification code must contain six digits",
  loginFailed: "Login failed",
  registerFailed: "Registration failed",
  sendCodeFailed: "Could not send the verification code",
  verifyCodeFailed: "Could not verify the code",
  resetFailed: "Could not update your password",
  resetExpired: "Verification has expired. Go back and verify a new code.",
  googleFailed: "Google Sign In failed",
} as const;

export const GOOGLE_SIGN_IN_MAX_WIDTH = 400;
