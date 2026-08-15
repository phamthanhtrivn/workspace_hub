package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
import vn.workspacehub.user.dto.response.PresignedUrlResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.events.UserProfileEventPublisher;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.mapper.UserProfileMapper;
import vn.workspacehub.user.repository.UserProfileRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;
    private final S3Service s3Service;
    private final UserProfileEventPublisher userProfileEventPublisher;

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
}
