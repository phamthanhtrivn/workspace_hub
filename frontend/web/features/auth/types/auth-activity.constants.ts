export const AUTH_ACTION = {
  LOGIN: "login",
  GOOGLE: "google",
  REGISTER: "register",
  SEND_RESET_CODE: "send-reset-code",
  VERIFY_RESET_CODE: "verify-reset-code",
  RESET_PASSWORD: "reset-password",
  SEND_VERIFICATION_CODE: "send-verification-code",
  VERIFY_EMAIL: "verify-email",
} as const;

export type AuthAction = (typeof AUTH_ACTION)[keyof typeof AUTH_ACTION];

export const AUTH_ACTIVITY_COPY = {
  login: { pending: "Signing you in...", button: "Signing in...", success: "Signed in successfully." },
  google: { pending: "Verifying your Google sign-in...", button: "Signing in with Google...", success: "Signed in with Google." },
  register: { pending: "Creating your account...", button: "Creating account...", success: "Account created. Verify your email to continue." },
  "send-reset-code": { pending: "Sending your password reset code...", button: "Sending code...", success: "Reset code requested. Check your email for the next step." },
  "verify-reset-code": { pending: "Checking your verification code...", button: "Verifying code...", success: "Code verified. Choose your new password." },
  "reset-password": { pending: "Updating your password...", button: "Updating password...", success: "Your password has been updated." },
  "send-verification-code": { pending: "Sending your email verification code...", button: "Sending code...", success: "Verification code requested. Check your email for the next step." },
  "verify-email": { pending: "Verifying your email address...", button: "Verifying email...", success: "Your email has been verified." },
} satisfies Record<AuthAction, { pending: string; button: string; success: string }>;

export const AUTH_REDIRECT_COPY = {
  workspace: "Signed in. Opening your workspace...",
  verification: "Account created. Opening email verification...",
  passwordReset: "Password updated. Returning to sign in...",
  emailVerified: "Email verified. Returning to sign in...",
} as const;

export const AUTH_REDIRECT_BUTTON = "Redirecting...";
