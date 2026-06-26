package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String OTP_PREFIX = "OTP_FORGOT_PWD:";
    private static final long OTP_TTL_MINUTES = 10;
    private final SecureRandom secureRandom = new SecureRandom();

    public String generateAndSaveOtp(String email) {
        // Generate a 6-digit OTP
        int number = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(number);
        
        String key = OTP_PREFIX + email;
        redisTemplate.opsForValue().set(key, otp, OTP_TTL_MINUTES, TimeUnit.MINUTES);
        
        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        if (email == null || otp == null) return false;
        
        String key = OTP_PREFIX + email;
        Object savedOtp = redisTemplate.opsForValue().get(key);
        
        return savedOtp != null && savedOtp.toString().equals(otp);
    }

    public void clearOtp(String email) {
        String key = OTP_PREFIX + email;
        redisTemplate.delete(key);
    }
}
