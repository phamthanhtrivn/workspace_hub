package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.util.EmailUtils;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redis;
    private final AuthAttemptLimiter attemptLimiter;
    
    private static final String OTP_PREFIX = "OTP_FORGOT_PWD:";
    private static final String ATTEMPTS_PREFIX = "OTP_FORGOT_ATTEMPTS:";
    private static final DefaultRedisScript<Long> VERIFY_AND_CONSUME = new DefaultRedisScript<>("""
        local attempts = redis.call('INCR', KEYS[2])
        if attempts == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
        if attempts > tonumber(ARGV[2]) then return 0 end
        local saved = redis.call('GET', KEYS[1])
        if saved and saved == ARGV[1] then
          redis.call('DEL', KEYS[1], KEYS[2])
          return 1
        end
        return 0
        """, Long.class);
    private final SecureRandom secureRandom = new SecureRandom();

    public String generateAndSaveOtp(String email) {
        attemptLimiter.beforeForgotPassword(email);
        // Generate a 6-digit OTP
        int number = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(number);
        
        String normalized = EmailUtils.normalize(email);
        redis.opsForValue().set(OTP_PREFIX + normalized, otp, Duration.ofSeconds(AuthPolicy.OTP_TTL_SECONDS));
        redis.delete(ATTEMPTS_PREFIX + normalized);
        
        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        if (email == null || otp == null || !otp.matches("[0-9]{6}")) return false;
        String normalized = EmailUtils.normalize(email);
        Long accepted = redis.execute(VERIFY_AND_CONSUME,
                List.of(OTP_PREFIX + normalized, ATTEMPTS_PREFIX + normalized),
                otp, Integer.toString(AuthPolicy.OTP_LIMIT), Integer.toString(AuthPolicy.OTP_TTL_SECONDS));
        return Long.valueOf(1).equals(accepted);
    }

    public void clearOtp(String email) {
        String normalized = EmailUtils.normalize(email);
        redis.delete(List.of(OTP_PREFIX + normalized, ATTEMPTS_PREFIX + normalized));
    }
}
