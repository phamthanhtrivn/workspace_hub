package vn.workspacehub.user.exception;

import vn.workspacehub.user.common.AuthPolicy;

public class AuthRateLimitException extends RuntimeException {
    public AuthRateLimitException() {
        super(AuthPolicy.RETRY_LATER);
    }
}
