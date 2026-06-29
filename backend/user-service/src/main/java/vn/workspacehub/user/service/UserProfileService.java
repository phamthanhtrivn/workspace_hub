package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.mapper.UserProfileMapper;
import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(UUID userId) {
        UserProfile userProfile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ người dùng"));

        return userProfileMapper.toResponse(userProfile);  
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UUID userId, UpdateUserProfileRequest request) {
        UserProfile userProfile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ người dùng"));

        userProfileMapper.updateEntityFromRequest(request, userProfile);

        UserProfile savedProfile = userProfileRepository.save(userProfile);
        return userProfileMapper.toResponse(savedProfile);
    }


}
