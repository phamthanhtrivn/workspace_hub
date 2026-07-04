package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.dto.response.AccountSettingResponse;
import vn.workspacehub.user.dto.response.UserSearchResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.entity.AccountSetting;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.dto.request.UpdatePrivacyRequest;

import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AccountSettingRepository accountSettingRepository;

    public AccountSettingResponse getAccountSettings(UUID userId) {
        AccountSetting setting = accountSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cài đặt cho người dùng này"));

        return AccountSettingResponse.builder()
                .theme(setting.getTheme())
                .language(setting.getLanguage())
                .timezone(setting.getTimezone())
                .allowSearchByEmail(setting.isAllowSearchByEmail())
                .build();
    }

    public List<UserSearchResponse> searchUserByEmail(UUID userId, String email) {
        List<User> users = userRepository.findByEmailContainingIgnoreCase(email);

        return users.stream()
                .filter(user -> !user.getId().equals(userId))
                .filter(user -> {
                    AccountSetting setting = user.getAccountSetting();
                    return setting == null || setting.isAllowSearchByEmail();
                })
                .map(user -> {
                    UserProfile profile = user.getProfile();
                    return UserSearchResponse.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .fullName(profile != null ? profile.getFullName() : null)
                            .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public void updatePrivacySettings(UUID userId, UpdatePrivacyRequest request) {
        AccountSetting setting = accountSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cài đặt cho người dùng này"));

        setting.setAllowSearchByEmail(request.isAllowSearchByEmail());
        accountSettingRepository.save(setting);
    }

    public UserProfileResponse getPublicProfile(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng"));

        UserProfile profile = user.getProfile();
        return UserProfileResponse.builder()
                .email(user.getEmail())
                .fullName(profile != null ? profile.getFullName() : null)
                .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                .phoneNumber(profile != null ? profile.getPhoneNumber() : null)
                .dob(profile != null ? profile.getDob() : null)
                .bio(profile != null ? profile.getBio() : null)
                .build();
    }
}
