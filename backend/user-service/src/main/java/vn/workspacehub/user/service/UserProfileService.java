package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.SetFirstPasswordRequest;
import vn.workspacehub.user.dto.request.UpdatePasswordRequest;
import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
import vn.workspacehub.user.dto.response.PresignedUrlResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.events.UserProfileEventPublisher;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.mapper.UserProfileMapper;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;
    private final S3Service s3Service;
    private final UserProfileEventPublisher userProfileEventPublisher;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(UUID userId) {
        UserProfile userProfile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("User profile not found"));

        return userProfileMapper.toResponse(userProfile);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UUID userId, UpdateUserProfileRequest request) {
        UserProfile userProfile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("User profile not found"));

        userProfileMapper.updateEntityFromRequest(request, userProfile);

        UserProfile savedProfile = userProfileRepository.save(userProfile);
        userProfileEventPublisher.publishSnapshotUpsertedAfterCommit(savedProfile.getUser());
        return userProfileMapper.toResponse(savedProfile);
    }

    public PresignedUrlResponse generateAvatarPresignedUrl(UUID userId, String fileName, String contentType) {
        String extension = "";
        int i = fileName.lastIndexOf('.');
        if (i > 0) {
            extension = fileName.substring(i);
        }

        String objectKey = "avatars/" + userId + "/" + UUID.randomUUID() + extension;
        return s3Service.generatePresignedUrl(objectKey, contentType);
    }

    @Transactional
    public void sendPasswordOtp(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found"));

        if (user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
            throw new BusinessException("Your account already has a password. Use the change-password flow instead.");
        }

        String otp = otpService.generateAndSaveOtp(user.getEmail());
        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    @Transactional
    public void setFirstPassword(UUID userId, SetFirstPasswordRequest request, String currentTokenHash) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found"));

        if (user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
            throw new BusinessException("Your account already has a password. Use the change-password flow instead.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessException("Passwords do not match");
        }

        boolean valid = otpService.validateOtp(user.getEmail(), request.getOtp());
        if (!valid) {
            throw new BusinessException("OTP is invalid or has expired");
        }

        otpService.clearOtp(user.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        if (currentTokenHash != null && !currentTokenHash.isBlank()) {
            refreshTokenRepository.revokeAllExceptCurrent(userId, currentTokenHash, LocalDateTime.now());
        }
    }

    @Transactional
    public void updatePassword(UUID userId, UpdatePasswordRequest request, String currentTokenHash) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found"));

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new BusinessException(
                    "Your account does not have a password yet. Use the set-password flow instead.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessException("Passwords do not match");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        if (currentTokenHash != null && !currentTokenHash.isBlank()) {
            refreshTokenRepository.revokeAllExceptCurrent(userId, currentTokenHash, LocalDateTime.now());
        }
    }
}
