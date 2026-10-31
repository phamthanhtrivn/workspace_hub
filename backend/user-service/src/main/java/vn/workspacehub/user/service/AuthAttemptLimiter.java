package vn.workspacehub.user.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.exception.AuthRateLimitException;
import vn.workspacehub.user.util.EmailUtils;

@Service
@RequiredArgsConstructor
public class AuthAttemptLimiter {
    private final StringRedisTemplate redis;
    private static final String LOGIN_PREFIX = "AUTH_LOGIN:";
    private static final String FORGOT_PREFIX = "AUTH_FORGOT:";
    private static final DefaultRedisScript<Long> INCREMENT = new DefaultRedisScript<>("""
        local attempts = redis.call('INCR', KEYS[1])
        if attempts == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
        return attempts
        """, Long.class);

    public void beforeLogin(String email) {
        consume(LOGIN_PREFIX + fingerprint(email), AuthPolicy.LOGIN_LIMIT, AuthPolicy.LOGIN_WINDOW_SECONDS);
    }

    public void loginSucceeded(String email) {
        redis.delete(LOGIN_PREFIX + fingerprint(email));
    }

    public void beforeForgotPassword(String email) {
        consume(FORGOT_PREFIX + fingerprint(email), AuthPolicy.FORGOT_LIMIT, AuthPolicy.FORGOT_WINDOW_SECONDS);
    }

    private void consume(String key, int limit, int seconds) {
        Long attempts = redis.execute(INCREMENT, List.of(key), Integer.toString(seconds));
        if (attempts == null) throw new IllegalStateException("Authentication attempt store unavailable");
        if (attempts > limit) throw new AuthRateLimitException();
    }

    private String fingerprint(String email) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(EmailUtils.normalize(email).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }
}
