package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.workspacehub.user.dto.request.UpdatePrivacyRequest;
import vn.workspacehub.user.dto.response.AccountSettingResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.dto.response.UserSearchResponse;
import vn.workspacehub.user.entity.AccountSetting;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.mapper.AccountSettingMapper;
import vn.workspacehub.user.mapper.UserMapper;
import vn.workspacehub.user.mapper.UserProfileMapper;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;
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
                .orElseThrow(() -> new BusinessException("Settings were not found for this user"));

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
                .orElseThrow(() -> new BusinessException("Settings were not found for this user"));

        setting.setAllowSearchByEmail(request.isAllowSearchByEmail());
        accountSettingRepository.save(setting);
    }

    public UserProfileResponse getPublicProfile(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found"));

        return userProfileMapper.toResponse(user);
    }

    public List<UserProfileResponse> getBulkProfiles(List<UUID> ids, List<String> emails) {
        List<User> users;
        if (ids != null && !ids.isEmpty()) {
            users = userRepository.findAllById(ids);
        } else if (emails != null && !emails.isEmpty()) {
            users = userRepository.findByEmailIn(emails);
        } else {
            users = List.of();
        }

        return users.stream()
                .map(userProfileMapper::toResponse)
                .collect(Collectors.toList());
    }
}
