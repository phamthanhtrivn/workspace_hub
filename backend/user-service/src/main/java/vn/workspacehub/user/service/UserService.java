package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.dto.response.AccountSettingResponse;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.entity.AccountSetting;

import java.util.UUID;

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
                .build();
    }
}
