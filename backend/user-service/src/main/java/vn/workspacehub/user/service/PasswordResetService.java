package vn.workspacehub.user.service;

import io.jsonwebtoken.ExpiredJwtException;
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

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public void requestForgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findUserByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Email does not exist"));

        String otp = otpService.generateAndSaveOtp(user.getEmail());
        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    public String verifyOtp(VerifyOtpRequest request) {
        boolean isValid = otpService.validateOtp(request.getEmail(), request.getOtp());
        if (!isValid) {
            throw new BusinessException("OTP is invalid or has expired");
        }

        User user = userRepository.findUserByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Email does not exist"));

        String resetToken = jwtService.generateResetToken(user.getId(), user.getEmail());

        otpService.clearOtp(request.getEmail());

        return resetToken;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        try {
            if (jwtService.isTokenExpired(request.getResetToken())) {
                throw new BusinessException("Reset token has expired");
            }

            String emailFromToken = jwtService.extractEmail(request.getResetToken());
            String roleFromToken = jwtService.extractRole(request.getResetToken());

            if (!request.getEmail().equals(emailFromToken) || !"RESET_PASSWORD_ROLE".equals(roleFromToken)) {
                throw new BusinessException("Reset token is invalid or does not belong to this email");
            }
        } catch (ExpiredJwtException e) {
            throw new BusinessException("Reset token has expired");
        } catch (Exception e) {
            throw new BusinessException("Reset token is invalid");
        }

        User user = userRepository.findUserByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Email does not exist"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
