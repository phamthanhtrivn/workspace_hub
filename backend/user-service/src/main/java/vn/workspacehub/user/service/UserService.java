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
import vn.workspacehub.user.mapper.AccountSettingMapper;
import vn.workspacehub.user.mapper.UserMapper;
import vn.workspacehub.user.mapper.UserProfileMapper;

import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AccountSettingRepository accountSettingRepository;
    private final AccountSettingMapper accountSettingMapper;
    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;

    public AccountSettingResponse getAccountSettings(UUID userId) {
        AccountSetting setting = accountSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cài đặt cho người dùng này"));

        return accountSettingMapper.toResponse(setting);
    }

    public List<UserSearchResponse> searchUserByEmail(UUID userId, String email) {
        List<User> users = userRepository.findByEmailContainingIgnoreCase(email);

        return users.stream()
                .filter(user -> !user.getId().equals(userId))
                .filter(user -> {
                    AccountSetting setting = user.getAccountSetting();
                    return setting == null || setting.isAllowSearchByEmail();
                })
                .map(userMapper::toSearchResponse)
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

        return userProfileMapper.toResponse(user);
    }

    public List<UserProfileResponse> getBulkProfilesByEmails(List<String> emails) {
        List<User> users = userRepository.findByEmailIn(emails);
        return users.stream()
                .map(userProfileMapper::toResponse)
                .collect(Collectors.toList());
    }
}
