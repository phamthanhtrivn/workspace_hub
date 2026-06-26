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
                .orElseThrow(() -> new BusinessException("Email không tồn tại trong hệ thống"));

        String otp = otpService.generateAndSaveOtp(user.getEmail());
        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    public String verifyOtp(VerifyOtpRequest request) {
        boolean isValid = otpService.validateOtp(request.getEmail(), request.getOtp());
        if (!isValid) {
            throw new BusinessException("Mã OTP không hợp lệ hoặc đã hết hạn");
        }

        User user = userRepository.findUserByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Email không tồn tại trong hệ thống"));

        String resetToken = jwtService.generateResetToken(user.getId(), user.getEmail());
        
        otpService.clearOtp(request.getEmail());
        
        return resetToken;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        try {
            if (jwtService.isTokenExpired(request.getResetToken())) {
                throw new BusinessException("Mã reset token đã hết hạn");
            }

            String emailFromToken = jwtService.extractEmail(request.getResetToken());
            String roleFromToken = jwtService.extractRole(request.getResetToken());

            if (!request.getEmail().equals(emailFromToken) || !"RESET_PASSWORD_ROLE".equals(roleFromToken)) {
                throw new BusinessException("Mã reset token không hợp lệ hoặc không thuộc về email này");
            }
        } catch (ExpiredJwtException e) {
            throw new BusinessException("Mã reset token đã hết hạn");
        } catch (Exception e) {
            throw new BusinessException("Mã reset token không hợp lệ");
        }

        User user = userRepository.findUserByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Email không tồn tại trong hệ thống"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
