export enum USER_ROLES {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum AuthProvider {
  GOOGLE = "GOOGLE",
}

export enum AuthRouteTarget {
  ADMIN_HOME = "/",
  USER_DASHBOARD = "/dashboard",
  LOGIN = "/login",
}

export enum ForgotPasswordStep {
  EMAIL = "EMAIL",
  OTP = "OTP",
  PASSWORD = "PASSWORD",
}

export enum AuthMutationKey {
  LOGIN = "auth-login",
  REGISTER = "auth-register",
  SOCIAL_LOGIN = "auth-social-login",
  LOGOUT = "auth-logout",
  REFRESH = "auth-refresh",
  SEND_RESET_OTP = "auth-send-reset-otp",
  VERIFY_RESET_OTP = "auth-verify-reset-otp",
  RESET_PASSWORD = "auth-reset-password",
}
