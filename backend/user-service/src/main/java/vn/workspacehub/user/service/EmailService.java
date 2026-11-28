package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Async
    public void sendVerificationEmail(String recipient, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipient);
            message.setSubject("Verify your email - Workspace Hub");
            message.setText("Your email verification code is: " + code + "\nThis code expires in 10 minutes. If you did not request it, ignore this email.");
            javaMailSender.send(message);
        } catch (Exception failure) { log.warn("Email verification delivery failed"); }
    }

    @Async
    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Password reset request - Workspace Hub");
            message.setText("Hello,\n\n"
                    + "Your verification code (OTP) for resetting your password is: " + otpCode + "\n\n"
                    + "This code is valid for 10 minutes.\n"
                    + "If you did not request a password reset, please ignore this email.\n\n"
                    + "Regards,\n"
                    + "Workspace Hub Team");

            javaMailSender.send(message);
            log.info("OTP email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", toEmail, e);
        }
    }
}
