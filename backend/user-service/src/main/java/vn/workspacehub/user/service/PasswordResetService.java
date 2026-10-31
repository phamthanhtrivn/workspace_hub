package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.ForgotPasswordRequest;
import vn.workspacehub.user.dto.request.ResetPasswordRequest;
import vn.workspacehub.user.dto.request.VerifyOtpRequest;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.repository.PasswordResetGrantRepository;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.entity.PasswordResetGrant;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.util.EmailUtils;
import io.jsonwebtoken.Claims;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetGrantRepository grants;
    private final RefreshTokenRepository refreshTokens;

    public void requestForgotPassword(ForgotPasswordRequest request) {
        String email = EmailUtils.normalize(request.getEmail());
        // Perform the same OTP-store work for unknown accounts and return the same response.
        String otp = otpService.generateAndSaveOtp(email);
        if (userRepository.findActiveUserIdByEmail(email).isPresent()) {
            emailService.sendOtpEmail(email, otp);
        }
    }

    @Transactional
    public String verifyOtp(VerifyOtpRequest request) {
        String email = EmailUtils.normalize(request.getEmail());
        boolean isValid = otpService.validateOtp(email, request.getOtp());
        if (!isValid) {
            throw new BusinessException(AuthPolicy.INVALID_OTP);
        }

        User user = userRepository.findUserByEmail(email)
                .filter(candidate -> candidate.getStatus() == vn.workspacehub.user.enums.UserStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(AuthPolicy.INVALID_OTP));

        String resetToken = jwtService.generateResetToken(user.getId(), user.getEmail());
        Claims claims = jwtService.extractResetClaims(resetToken);
        grants.save(PasswordResetGrant.builder().id(UUID.fromString(claims.getId())).userId(user.getId())
                .expiresAt(LocalDateTime.ofInstant(claims.getExpiration().toInstant(), ZoneOffset.UTC)).build());

        return resetToken;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        Claims claims;
        try {
            claims = jwtService.extractResetClaims(request.getResetToken());
            if (!EmailUtils.normalize(request.getEmail()).equals(claims.get("email", String.class)))
                throw new IllegalArgumentException(AuthPolicy.INVALID_RESET);
        } catch (Exception e) {
            throw new BusinessException(AuthPolicy.INVALID_RESET);
        }

        User user = userRepository.findForUpdateById(UUID.fromString(claims.getSubject()))
                .filter(candidate -> candidate.getStatus() == vn.workspacehub.user.enums.UserStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(AuthPolicy.INVALID_RESET));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (grants.consume(UUID.fromString(claims.getId()), user.getId(), now) != 1)
            throw new BusinessException(AuthPolicy.INVALID_RESET);

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setEmailVerified(true);
        userRepository.save(user);
        grants.invalidateForUser(user.getId(), now);
        refreshTokens.revokeAllForUser(user.getId(), LocalDateTime.now());
    }
}
