package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.EmailUtils;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final UserRepository users;
    private final OtpService otp;
    private final EmailService email;
    private final AuthAttemptLimiter limiter;

    public void send(String address, String clientIp) {
        String normalized = EmailUtils.normalize(address);
        limiter.beforeEmailVerification(normalized, clientIp);
        String code = otp.generateAndSaveOtp(normalized, AuthPolicy.EMAIL_VERIFICATION_PURPOSE);
        if (users.findUserByEmail(normalized).filter(user -> user.getStatus() == UserStatus.ACTIVE && !user.isEmailVerified()).isPresent())
            email.sendVerificationEmail(normalized, code);
    }

    @Transactional
    public void confirm(String address, String code) {
        String normalized = EmailUtils.normalize(address);
        var user = users.findForUpdateByEmail(normalized)
                .filter(candidate -> candidate.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(AuthPolicy.INVALID_OTP));
        if (!otp.validateOtp(normalized, code, AuthPolicy.EMAIL_VERIFICATION_PURPOSE))
            throw new BusinessException(AuthPolicy.INVALID_OTP);
        user.setEmailVerified(true);
        users.save(user);
    }
}
