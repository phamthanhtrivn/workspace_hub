package vn.workspacehub.user.common;

public final class AuthPolicy {
    public static final String REFRESH_COOKIE = "refreshToken";
    public static final String INVALID_CREDENTIALS = "Email or password is incorrect";
    public static final String GOOGLE_FAILED = "Google authentication failed";
    public static final String INVALID_RESET = "Reset token is invalid or has expired";
    public static final String INVALID_OTP = "OTP is invalid or has expired";
    public static final String SESSION_NOT_FOUND = "Session does not exist or has already been revoked";
    public static final String RETRY_LATER = "Too many attempts. Please try again later.";
    public static final String FORGOT_ACCEPTED = "If the account is eligible, a verification code will be sent.";
    public static final int LOGIN_LIMIT = 10;
    public static final int LOGIN_WINDOW_SECONDS = 900;
    public static final int FORGOT_LIMIT = 3;
    public static final int FORGOT_WINDOW_SECONDS = 900;
    public static final int OTP_LIMIT = 5;
    public static final int OTP_TTL_SECONDS = 600;
    public static final int RESET_TTL_SECONDS = 900;
    public static final int MAX_PASSWORD_BYTES = 72;
    public static final int MAX_EMAIL_LENGTH = 254;
    public static final int MAX_FULL_NAME_LENGTH = 100;
    public static final int MAX_CREDENTIAL_LENGTH = 16_384;
    public static final String TOKEN_USE_CLAIM = "token_use";
    public static final String ACCESS_TOKEN_USE = "access";
    public static final String RESET_TOKEN_USE = "password_reset";
    public static final String RESET_ROLE = "RESET_PASSWORD_ROLE";
    public static final String RESET_AUDIENCE = "workspace-hub:password-reset";
    public static final String PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\p{P}\\p{S}])\\S{8,72}$";

    private AuthPolicy() {}
}
